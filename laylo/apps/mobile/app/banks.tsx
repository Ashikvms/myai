import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
// react-native-plaid-link-sdk requires a custom dev client.
// `create()` initialises the SDK with a server-issued link token,
// then `open()` presents the Plaid Link UI.
import {
  create,
  open,
  type LinkSuccess,
  type LinkExit,
} from 'react-native-plaid-link-sdk';
import {
  createLinkToken,
  disconnectItem,
  exchangePublicToken,
  listItems,
  triggerSync,
} from '../src/lib/api/plaid';
import type { PlaidItem, PlaidItemStatus } from '../src/lib/api/types';

const COLORS = {
  primary: '#6366F1',
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#111',
  textSecondary: '#666',
  textMuted: '#9CA3AF',
  border: '#F3F4F6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const STATUS_LABEL: Record<PlaidItemStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: COLORS.success },
  LOGIN_REQUIRED: { label: 'Re-auth', color: COLORS.warning },
  ERROR: { label: 'Error', color: COLORS.danger },
  DISCONNECTED: { label: 'Off', color: COLORS.textMuted },
};

function formatLastSync(iso: string | null): string {
  if (!iso) return 'Never synced';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never synced';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function BanksScreen() {
  const router = useRouter();
  const [items, setItems] = useState<PlaidItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [linking, setLinking] = useState(false);
  const [busyById, setBusyById] = useState<Record<string, 'sync' | 'disconnect'>>({});

  const load = useCallback(async () => {
    try {
      const data = await listItems();
      setItems(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load banks';
      Alert.alert('Error', msg);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Plaid Link flow:
  //   1) request a fresh link_token from our API
  //   2) hand it to Plaid SDK via `create()`
  //   3) `open()` presents native UI
  //   4) onSuccess returns a public_token + metadata — POST straight to /exchange
  // The public_token is short-lived and never persisted client-side.
  const handleConnect = useCallback(async () => {
    if (linking) return;
    setLinking(true);
    try {
      const { linkToken } = await createLinkToken();
      create({ token: linkToken });
      open({
        onSuccess: async (success: LinkSuccess) => {
          try {
            const institution = success.metadata.institution;
            if (!institution) {
              Alert.alert('Error', 'Institution metadata missing');
              return;
            }
            await exchangePublicToken({
              publicToken: success.publicToken,
              institutionId: institution.id,
              institutionName: institution.name,
              accounts: success.metadata.accounts.map((a) => ({
                id: a.id,
                name: a.name ?? '',
                mask: a.mask ?? null,
                type: String(a.type),
                subtype: a.subtype ? String(a.subtype) : null,
              })),
            });
            await load();
          } catch (err) {
            const msg =
              err instanceof Error ? err.message : 'Failed to link account';
            Alert.alert('Error', msg);
          }
        },
        onExit: (_exit: LinkExit) => {
          // user cancelled or hit an error mid-flow — nothing to persist
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not start Plaid Link';
      Alert.alert('Error', msg);
    } finally {
      setLinking(false);
    }
  }, [linking, load]);

  const handleSync = useCallback(async (id: string) => {
    setBusyById((prev) => ({ ...prev, [id]: 'sync' }));
    try {
      await triggerSync(id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      Alert.alert('Error', msg);
    } finally {
      setBusyById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, []);

  const handleDisconnect = useCallback(
    (id: string) => {
      Alert.alert(
        'Disconnect bank?',
        'Historical transactions stay, but no new data will sync.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              setBusyById((prev) => ({ ...prev, [id]: 'disconnect' }));
              try {
                await disconnectItem(id);
                await load();
              } catch (err) {
                const msg =
                  err instanceof Error ? err.message : 'Disconnect failed';
                Alert.alert('Error', msg);
              } finally {
                setBusyById((prev) => {
                  const next = { ...prev };
                  delete next[id];
                  return next;
                });
              }
            },
          },
        ],
      );
    },
    [load],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connected Banks</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Connect CTA */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.connectButton, linking && { opacity: 0.6 }]}
          disabled={linking}
          onPress={handleConnect}
        >
          {linking ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.connectButtonText}>+ Connect a bank</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.helperText}>
          Read-only Plaid connection. We never store your bank login.
        </Text>

        {/* Body */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : !items || items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🏦</Text>
            <Text style={styles.emptyTitle}>No banks connected yet</Text>
            <Text style={styles.emptyDesc}>
              Connect a bank to automatically sync your transactions and balances.
            </Text>
          </View>
        ) : (
          items.map((item) => {
            const status = STATUS_LABEL[item.status];
            const busy = busyById[item.id];
            const accountsCount = item.accounts?.length ?? 0;
            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemAvatar}>
                    <Text style={styles.itemAvatarText}>
                      {item.institutionName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.itemTitleRow}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.institutionName}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: status.color + '20' }]}>
                        <Text style={[styles.badgeText, { color: status.color }]}>
                          {status.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.itemSubtitle}>
                      {accountsCount} {accountsCount === 1 ? 'account' : 'accounts'} · {formatLastSync(item.lastSyncAt)}
                    </Text>
                    {!!item.errorMessage && (
                      <Text style={styles.errorMsg}>{item.errorMessage}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionSecondary]}
                    disabled={busy === 'sync' || item.status === 'DISCONNECTED'}
                    onPress={() => handleSync(item.id)}
                  >
                    {busy === 'sync' ? (
                      <ActivityIndicator size="small" color={COLORS.text} />
                    ) : (
                      <Text style={styles.actionSecondaryText}>Sync</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionDanger]}
                    disabled={busy === 'disconnect' || item.status === 'DISCONNECTED'}
                    onPress={() => handleDisconnect(item.id)}
                  >
                    {busy === 'disconnect' ? (
                      <ActivityIndicator size="small" color={COLORS.danger} />
                    ) : (
                      <Text style={styles.actionDangerText}>Disconnect</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 18, fontWeight: '600', color: '#374151' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  connectButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  connectButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  helperText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingWrap: { paddingTop: 40, alignItems: 'center' },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyEmoji: { fontSize: 32, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 260 },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemAvatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1 },
  itemSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  errorMsg: { fontSize: 11, color: COLORS.danger, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  itemActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionSecondary: { backgroundColor: '#F3F4F6' },
  actionSecondaryText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  actionDanger: { backgroundColor: '#FEE2E2' },
  actionDangerText: { color: COLORS.danger, fontSize: 13, fontWeight: '600' },
});
