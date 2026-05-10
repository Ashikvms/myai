/**
 * Transactions — Phase 3b restyle.
 *
 * Black + gold tokens. Inflows tinted success-green; outflows neutral.
 * AskAi sparkle on every row + a hero pill in the header.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  listAccounts,
  listTransactions,
} from '../src/lib/api/transactions';
import type {
  BankAccount,
  Transaction,
  TransactionsQuery,
} from '../src/lib/api/types';
import { tokens, radius, spacing } from '../src/lib/tokens';
import { AiBottomSheet, AskAiButton, useAiSheet } from '../src/components/ai';
import { BeeMagnifying } from '../src/components/illustrations/bee';
import { StaggeredListItem } from '../src/components/motion/staggered-list-item';
import { TransactionDetailSheet } from '../src/components/transactions/transaction-detail-sheet';

const PAGE_SIZE = 50;

function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export default function TransactionsScreen() {
  const router = useRouter();
  const sheet = useAiSheet('Help me understand this transaction.');

  // Filters
  const [accountId, setAccountId] = useState('');
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Data
  const [items, setItems] = useState<Transaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Detail sheet — Item 28 Phase 3b
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);

  const baseQuery: TransactionsQuery = useMemo(
    () => ({
      accountId: accountId || undefined,
      q: q || undefined,
      limit: PAGE_SIZE,
    }),
    [accountId, q],
  );

  const accountById = useMemo(() => {
    const map = new Map<string, BankAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  useEffect(() => {
    let cancelled = false;
    listAccounts()
      .then((data) => {
        if (!cancelled) setAccounts(data);
      })
      .catch(() => {
        // non-fatal
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPageOne = useCallback(async () => {
    try {
      const res = await listTransactions(baseQuery);
      setItems(res.items);
      setNextCursor(res.nextCursor);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Hmm, something stung. Try again?';
      Alert.alert('Error', msg);
      setItems([]);
      setNextCursor(null);
    }
  }, [baseQuery]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadPageOne().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadPageOne]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPageOne();
    setRefreshing(false);
  }, [loadPageOne]);

  const onEndReached = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listTransactions({ ...baseQuery, cursor: nextCursor });
      setItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load more';
      Alert.alert('Error', msg);
    } finally {
      setLoadingMore(false);
    }
  }, [baseQuery, nextCursor, loadingMore]);

  const submitSearch = useCallback(() => {
    setQ(searchInput.trim());
  }, [searchInput]);

  const renderItem = useCallback(
    ({ item: t, index }: { item: Transaction; index: number }) => {
      const amt = toNumber(t.amount);
      const isInflow = amt < 0;
      const acct = accountById.get(t.bankAccountId) ?? t.bankAccount;
      const acctLabel = acct
        ? acct.name + (acct.mask ? ` ····${acct.mask}` : '')
        : '';
      return (
        <StaggeredListItem index={index}>
        <PressableTxnRow
          onPress={() => setSelectedTxnId(t.id)}
          onLongPress={() =>
            sheet.open(
              `Why did the "${t.merchantName || t.name}" transaction repeat?`,
            )
          }
          dim={t.pending ?? false}
        >
          <View style={styles.rowIcon}>
            <Text style={styles.rowIconText}>{isInflow ? '↓' : '↑'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.rowTitleLine}>
              <Text style={styles.rowMerchant} numberOfLines={1}>
                {t.merchantName || t.name}
              </Text>
              {t.pending && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
              )}
            </View>
            <Text style={styles.rowMeta} numberOfLines={1}>
              {formatDate(t.date)}
              {t.category ? ` · ${t.category}` : ''}
              {acctLabel ? ` · ${acctLabel}` : ''}
            </Text>
          </View>
          <Text style={[styles.rowAmount, isInflow && styles.amountInflow]}>
            {isInflow ? '+' : '−'}
            {formatCurrency(Math.abs(amt), t.isoCurrencyCode || 'USD')}
          </Text>
          <AskAiButton
            variant="icon"
            onPress={() =>
              sheet.open(
                `Why did the "${t.merchantName || t.name}" transaction repeat?`,
              )
            }
          />
        </PressableTxnRow>
        </StaggeredListItem>
      );
    },
    [accountById, sheet],
  );

  const keyExtractor = useCallback((t: Transaction) => t.id, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.eyebrow}>YOUR MONEY</Text>
          <Text style={styles.headerTitle}>Transactions</Text>
        </View>
        <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterButton}>
          <Text style={styles.filterIcon}>≡</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={submitSearch}
          returnKeyType="search"
          placeholder="Search merchant or description…"
          placeholderTextColor={tokens.textSubtle}
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={tokens.accent} />
          <Text style={styles.loadingHint}>Following the honey trail…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={tokens.accent}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <BeeMagnifying size={120} />
              <Text style={styles.emptyTitle}>
                {q
                  ? "Couldn't find anything"
                  : 'Connect a bank to see what’s been flowing'}
              </Text>
              <Text style={styles.emptyDesc}>
                Pull down to refresh, or ask BillBee to dig deeper.
              </Text>
              <View style={{ marginTop: spacing.lg }}>
                <AskAiButton
                  variant="chip"
                  label="Ask BillBee"
                  onPress={() => sheet.open('Help me understand my transactions.')}
                />
              </View>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={tokens.accent} />
              </View>
            ) : null
          }
        />
      )}

      {/* Filter sheet */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Filter transactions</Text>
            <Text style={styles.sheetLabel}>Account</Text>
            <ScrollableRow
              options={[
                { id: '', label: 'All accounts' },
                ...accounts.map((a) => ({
                  id: a.id,
                  label: a.name + (a.mask ? ` ····${a.mask}` : ''),
                })),
              ]}
              activeId={accountId}
              onSelect={setAccountId}
            />
            <View style={styles.sheetButtons}>
              <TouchableOpacity
                style={styles.sheetClearButton}
                onPress={() => {
                  setAccountId('');
                  setQ('');
                  setSearchInput('');
                }}
              >
                <Text style={styles.sheetClearText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetApplyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.sheetApplyText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AiBottomSheet
        visible={sheet.visible}
        onClose={sheet.close}
        initialPrompt={sheet.prompt}
      />

      <TransactionDetailSheet
        transactionId={selectedTxnId}
        onClose={() => setSelectedTxnId(null)}
      />
    </View>
  );
}

function PressableTxnRow({
  children,
  onPress,
  onLongPress,
  dim,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  dim?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPressIn = () => {
    if (reduceMotion) return;
    scale.value = withSpring(0.98, { stiffness: 320, damping: 22 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { stiffness: 320, damping: 22 });
  };
  // RN Pressable already suppresses onPress when onLongPress fires past
  // delayLongPress, so the two are mutually exclusive — tap opens detail,
  // tap-and-hold opens AskAi without the detail sheet flashing.
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onLongPress={onLongPress}
      delayLongPress={420}
    >
      <Animated.View style={[styles.row, dim && { opacity: 0.6 }, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function ScrollableRow({
  options,
  activeId,
  onSelect,
}: {
  options: { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.pillRow}>
      {options.map((o) => {
        const active = o.id === activeId;
        return (
          <TouchableOpacity
            key={o.id || 'all'}
            onPress={() => onSelect(o.id)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.bg },
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
    backgroundColor: tokens.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 18, fontWeight: '600', color: tokens.text },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: tokens.textSubtle,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    color: tokens.text,
    textAlign: 'center',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: tokens.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIcon: { fontSize: 18, color: tokens.text },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md - 2,
    paddingBottom: spacing.sm,
  },
  searchInput: {
    backgroundColor: tokens.surface2,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: tokens.text,
  },
  loadingWrap: { paddingTop: 60, alignItems: 'center', gap: spacing.sm },
  loadingHint: {
    fontSize: 12,
    color: tokens.textMuted,
    fontWeight: '500',
  },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.surface,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md - 2,
    borderWidth: 1,
    borderColor: tokens.border,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: tokens.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: { fontSize: 14, fontWeight: '700', color: tokens.textMuted },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowMerchant: { fontSize: 14, fontWeight: '600', color: tokens.text, flex: 1 },
  rowMeta: { fontSize: 11, color: tokens.textSubtle, marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: '700', color: tokens.text },
  amountInflow: { color: tokens.success },
  pendingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: tokens.surface2,
  },
  pendingText: { fontSize: 10, fontWeight: '700', color: tokens.warning },
  separator: { height: spacing.sm },
  emptyCard: {
    backgroundColor: tokens.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.border,
    marginTop: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    fontSize: 16,
    fontWeight: '600',
    color: tokens.text,
    textAlign: 'center',
  },
  emptyDesc: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: tokens.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: tokens.surface,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl + 4 : spacing.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: tokens.borderStrong,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: tokens.text,
    marginBottom: spacing.lg,
  },
  sheetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: tokens.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: tokens.surface2,
  },
  pillActive: { backgroundColor: tokens.text },
  pillText: { fontSize: 12, fontWeight: '600', color: tokens.textMuted },
  pillTextActive: { color: tokens.bg },
  sheetButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  sheetClearButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: tokens.surface2,
    alignItems: 'center',
  },
  sheetClearText: { fontSize: 14, fontWeight: '600', color: tokens.text },
  sheetApplyButton: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: tokens.accent,
    alignItems: 'center',
  },
  sheetApplyText: { fontSize: 14, fontWeight: '700', color: tokens.textOnAccent },
});
