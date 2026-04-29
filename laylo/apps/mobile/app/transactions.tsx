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
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  listAccounts,
  listTransactions,
} from '../src/lib/api/transactions';
import type {
  BankAccount,
  Transaction,
  TransactionsQuery,
} from '../src/lib/api/types';

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
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export default function TransactionsScreen() {
  const router = useRouter();

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

  // Load accounts once.
  useEffect(() => {
    let cancelled = false;
    listAccounts()
      .then((data) => {
        if (!cancelled) setAccounts(data);
      })
      .catch(() => {
        // Non-fatal — filter just won't have account options.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reload page 1 whenever filters change.
  const loadPageOne = useCallback(async () => {
    try {
      const res = await listTransactions(baseQuery);
      setItems(res.items);
      setNextCursor(res.nextCursor);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load transactions';
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
    ({ item: t }: { item: Transaction }) => {
      const amt = toNumber(t.amount);
      const isInflow = amt < 0;
      const acct = accountById.get(t.bankAccountId) ?? t.bankAccount;
      const acctLabel = acct
        ? acct.name + (acct.mask ? ` ····${acct.mask}` : '')
        : '';
      return (
        <View style={[styles.row, t.pending && { opacity: 0.6 }]}>
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
        </View>
      );
    },
    [accountById],
  );

  const keyExtractor = useCallback((t: Transaction) => t.id, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterButton}>
          <Text style={styles.filterIcon}>⚙</Text>
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
          placeholder="Search merchant or description..."
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🧾</Text>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyDesc}>
                Connect a bank from Settings → Banks to start syncing.
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={COLORS.primary} />
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
    </View>
  );
}

// Tiny pill row for the bottom-sheet filter — avoids pulling in a real
// dropdown lib.
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
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIcon: { fontSize: 18, color: '#374151' },
  searchWrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, backgroundColor: COLORS.surface },
  searchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: COLORS.text,
  },
  loadingWrap: { paddingTop: 60, alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowMerchant: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1 },
  rowMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  amountInflow: { color: COLORS.success },
  pendingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FEF3C7',
  },
  pendingText: { fontSize: 10, fontWeight: '700', color: COLORS.warning },
  separator: { height: 8 },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 24,
  },
  emptyEmoji: { fontSize: 32, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 260 },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  sheetLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  pillActive: { backgroundColor: COLORS.primary },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  pillTextActive: { color: '#FFF' },
  sheetButtons: { flexDirection: 'row', gap: 8, marginTop: 8 },
  sheetClearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  sheetClearText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  sheetApplyButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  sheetApplyText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
