import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { listAccounts, listTransactions } from '../../src/lib/api/transactions';
import type { BankAccount, Transaction } from '../../src/lib/api/types';

const COLORS = {
  primary: '#6366F1',
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#111',
  textSecondary: '#666',
};

const STATS = [
  { label: 'Pending Tasks', value: '5', emoji: '📋', color: '#6366F1' },
  { label: 'Bills Due', value: '2', emoji: '💰', color: '#F59E0B' },
  { label: 'Subscriptions', value: '$78', emoji: '🔄', color: '#8B5CF6' },
  { label: 'Appointments', value: '2', emoji: '📅', color: '#10B981' },
];

const INSIGHTS = [
  {
    color: '#F59E0B',
    title: 'Bill Payment Reminder',
    description: 'Your electricity bill of $142 is due in 3 days. Set up autopay to never miss a payment.',
  },
  {
    color: '#EF4444',
    title: 'Subscription Alert',
    description: 'You have 3 unused subscriptions costing $45/month. Consider canceling to save $540/year.',
  },
  {
    color: '#10B981',
    title: 'Tax Document Ready',
    description: 'Your W-2 form has been uploaded. I can help you organize your tax documents.',
  },
];

const TASKS = [
  { id: '1', title: 'Renew car insurance', priority: 'high', done: false },
  { id: '2', title: 'Schedule dentist appointment', priority: 'medium', done: false },
  { id: '3', title: 'Pay electricity bill', priority: 'high', done: true },
];

const QUICK_ACTIONS = [
  { label: 'Add Task', emoji: '➕' },
  { label: 'Add Bill', emoji: '💳' },
  { label: 'Upload Doc', emoji: '📎' },
  { label: 'Ask AI', emoji: '✨' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

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

function ConnectedAccountsTile() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<BankAccount[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listAccounts()
      .then((data) => {
        if (!cancelled) setAccounts(data);
      })
      .catch(() => {
        if (!cancelled) setAccounts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalBalance =
    accounts?.reduce((sum, a) => {
      if (a.type !== 'DEPOSITORY') return sum;
      return sum + toNumber(a.currentBalance);
    }, 0) ?? 0;
  const count = accounts?.length ?? 0;
  const isEmpty = !loading && count === 0;

  return (
    <TouchableOpacity
      style={styles.banksTile}
      activeOpacity={0.85}
      onPress={() => router.push('/banks' as never)}
    >
      <View style={styles.banksTileHeader}>
        <View style={styles.banksTileIcon}>
          <Text style={styles.banksTileEmoji}>🏦</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.banksTileLabel}>Connected Accounts</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 6 }} />
          ) : isEmpty ? (
            <Text style={styles.banksTileEmpty}>No banks linked</Text>
          ) : (
            <Text style={styles.banksTileValue}>{formatCurrency(totalBalance)}</Text>
          )}
        </View>
      </View>
      <Text style={styles.banksTileCta}>
        {isEmpty ? 'Connect a bank →' : `${count} ${count === 1 ? 'account' : 'accounts'} · Manage →`}
      </Text>
    </TouchableOpacity>
  );
}

function RecentTransactionsTile() {
  const router = useRouter();
  const [items, setItems] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listTransactions({ limit: 5 })
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.txnSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <TouchableOpacity onPress={() => router.push('/transactions' as never)}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.txnLoadingWrap}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : !items || items.length === 0 ? (
        <View style={styles.txnEmpty}>
          <Text style={styles.txnEmptyText}>No transactions yet — connect a bank to start.</Text>
        </View>
      ) : (
        items.map((t) => {
          const amt = toNumber(t.amount);
          const isInflow = amt < 0;
          return (
            <TouchableOpacity
              key={t.id}
              activeOpacity={0.7}
              onPress={() => router.push('/transactions' as never)}
              style={[styles.txnRow, t.pending && { opacity: 0.6 }]}
            >
              <View style={styles.txnRowIcon}>
                <Text style={styles.txnRowIconText}>{isInflow ? '↓' : '↑'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txnMerchant} numberOfLines={1}>
                  {t.merchantName || t.name}
                </Text>
                <Text style={styles.txnMeta} numberOfLines={1}>
                  {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {t.category ? ` · ${t.category}` : ''}
                </Text>
              </View>
              <Text style={[styles.txnAmount, isInflow && { color: '#22C55E' }]}>
                {isInflow ? '+' : '−'}
                {formatCurrency(Math.abs(amt), t.isoCurrencyCode || 'USD')}
              </Text>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const bgColor = priority === 'high' ? '#FEE2E2' : priority === 'medium' ? '#FEF3C7' : '#DCFCE7';
  const textColor = priority === 'high' ? '#DC2626' : priority === 'medium' ? '#D97706' : '#16A34A';

  return (
    <View style={[styles.priorityBadge, { backgroundColor: bgColor }]}>
      <Text style={[styles.priorityText, { color: textColor }]}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>Alex</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AJ</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {STATS.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: stat.color + '15' }]}>
              <Text style={styles.statEmoji}>{stat.emoji}</Text>
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Banking widgets — live data */}
      <View style={styles.section}>
        <ConnectedAccountsTile />
      </View>
      <RecentTransactionsTile />

      {/* AI Insights */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
          <Text style={styles.sectionEmoji}>✨</Text>
        </View>
        {INSIGHTS.map((insight, index) => (
          <View key={index} style={styles.insightCard}>
            <View style={[styles.insightBorder, { backgroundColor: insight.color }]} />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightDesc}>{insight.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Today's Tasks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {TASKS.map((task) => (
          <TouchableOpacity key={task.id} style={styles.taskCard} activeOpacity={0.7}>
            <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
              {task.done && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>
              {task.title}
            </Text>
            <PriorityBadge priority={task.priority} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsRow}
        >
          {QUICK_ACTIONS.map((action, index) => (
            <TouchableOpacity key={index} style={styles.quickActionBtn} activeOpacity={0.7}>
              <View style={styles.quickActionIcon}>
                <Text style={styles.quickActionEmoji}>{action.emoji}</Text>
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 20,
    backgroundColor: COLORS.surface,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statEmoji: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionEmoji: {
    fontSize: 18,
  },
  seeAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  insightBorder: {
    width: 4,
  },
  insightContent: {
    flex: 1,
    padding: 14,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  insightDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickActionsRow: {
    paddingTop: 8,
    gap: 12,
  },
  quickActionBtn: {
    alignItems: 'center',
    width: 80,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionEmoji: {
    fontSize: 24,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
  // ── Banking widgets ────────────────────────────────────────────
  banksTile: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  banksTileHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  banksTileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#22C55E15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  banksTileEmoji: { fontSize: 22 },
  banksTileLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  banksTileValue: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  banksTileEmpty: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 4 },
  banksTileCta: { fontSize: 12, fontWeight: '600', color: COLORS.primary, marginTop: 12 },
  txnSection: { paddingHorizontal: 16, marginTop: 24 },
  txnLoadingWrap: { paddingVertical: 24, alignItems: 'center' },
  txnEmpty: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  txnEmptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  txnRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnRowIconText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  txnMerchant: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  txnMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  txnAmount: { fontSize: 14, fontWeight: '700', color: COLORS.text },
});
