/**
 * Banks — Phase 3b restyle.
 *
 * Plaid behaviour preserved verbatim — only colour tokens changed.
 * Empty state uses the standing bee + copy-bank line.
 */
import React, { useMemo, useCallback, useEffect, useState } from 'react';
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
import { useTokens, type Tokens, radius, spacing } from '../src/lib/tokens';
import { BeeStanding } from '../src/components/illustrations/bee';

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
  const t = useTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const statusLabel = useMemo<
    Record<PlaidItemStatus, { label: string; color: string }>
  >(
    () => ({
      ACTIVE: { label: 'Active', color: t.success },
      LOGIN_REQUIRED: { label: 'Re-auth', color: t.warning },
      ERROR: { label: 'Error', color: t.danger },
      DISCONNECTED: { label: 'Off', color: t.textSubtle },
    }),
    [t],
  );
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
      const msg = err instanceof Error ? err.message : 'Hmm, something stung. Try again?';
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
        'Send this one out of the hive?',
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.eyebrow}>YOUR MONEY</Text>
          <Text style={styles.headerTitle}>Connected Banks</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.accent}
          />
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
            <ActivityIndicator color={t.textOnAccent} />
          ) : (
            <Text style={styles.connectButtonText}>+ Connect a bank</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.helperText}>
          Read-only Plaid connection. We never store your bank login.
        </Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={t.accent} />
            <Text style={styles.loadingHint}>Hang on, organising your hive…</Text>
          </View>
        ) : !items || items.length === 0 ? (
          <View style={styles.emptyCard}>
            <BeeStanding size={120} />
            <Text style={styles.emptyTitle}>
              Connect a bank — we&apos;ll handle the honey trail.
            </Text>
            <Text style={styles.emptyDesc}>
              Link an institution to automatically sync transactions and balances.
            </Text>
          </View>
        ) : (
          items.map((item) => {
            const status = statusLabel[item.status];
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
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: status.color + '20' },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: status.color }]}>
                          {status.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.itemSubtitle}>
                      {accountsCount} {accountsCount === 1 ? 'account' : 'accounts'}{' '}
                      · {formatLastSync(item.lastSyncAt)}
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
                      <ActivityIndicator size="small" color={t.text} />
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
                      <ActivityIndicator size="small" color={t.danger} />
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

function makeStyles(t: Tokens) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: t.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 18, fontWeight: '600', color: t.text },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: t.textSubtle,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    color: t.text,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 40,
  },
  connectButton: {
    backgroundColor: t.accent,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  connectButtonText: { color: t.textOnAccent, fontSize: 16, fontWeight: '700' },
  helperText: {
    fontSize: 12,
    color: t.textSubtle,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  loadingWrap: { paddingTop: 40, alignItems: 'center', gap: spacing.sm },
  loadingHint: { fontSize: 12, color: t.textMuted, fontWeight: '500' },
  emptyCard: {
    backgroundColor: t.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: t.border,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    fontSize: 16,
    fontWeight: '600',
    color: t.text,
    textAlign: 'center',
  },
  emptyDesc: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: t.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
  itemCard: {
    backgroundColor: t.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: t.border,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: t.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemAvatarText: { color: t.text, fontSize: 13, fontWeight: '700' },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemName: { fontSize: 15, fontWeight: '600', color: t.text, flex: 1 },
  itemSubtitle: { fontSize: 12, color: t.textSubtle, marginTop: 4 },
  errorMsg: { fontSize: 11, color: t.danger, marginTop: 4 },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  itemActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md + 2 },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  actionSecondary: { backgroundColor: t.surface2 },
  actionSecondaryText: { color: t.text, fontSize: 13, fontWeight: '600' },
  actionDanger: { backgroundColor: 'rgba(239,68,68,0.10)' },
  actionDangerText: { color: t.danger, fontSize: 13, fontWeight: '600' },
});
}

type Styles = ReturnType<typeof makeStyles>;

