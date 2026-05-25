/**
 * Home tab — Phase 3b restyle.
 *
 * Black + bumblebee gold paint. Single-accent rule: only one tile
 * uses gold (the most actionable stat). AskAi pill in the header
 * + small sparkle on each Insight card. Bee mascot fronts the
 * "all clear" empty state on Today's Tasks.
 */
import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listAccounts, listTransactions } from '../../src/lib/api/transactions';
import type { BankAccount, Transaction } from '../../src/lib/api/types';
import { getDashboard, getGoogleStatus, pollGmail } from '../../src/lib/api/resources';
import { InboxTriageCard } from '../../src/components/google/inbox-triage-card';
import { useAuth } from '../../src/context/auth';
import { useTokens, type Tokens, radius, spacing } from '../../src/lib/tokens';
import {
  AiBottomSheet,
  AskAiButton,
  SparkleIcon,
  useAiSheet,
} from '../../src/components/ai';
import { BeeSleeping, BeeStanding } from '../../src/components/illustrations/bee';
import { AnimatedNumber } from '../../src/components/motion/animated-number';
import { BreathingBee } from '../../src/components/motion/breathing-bee';
import { FloatingBee } from '../../src/components/motion/floating-bee';
import { BeeEntrance } from '../../src/components/motion/bee-entrance';

type Stat = {
  label: string;
  value: number;
  accent: boolean;
  /** Optional formatter — defaults to `Math.round`. */
  format?: (n: number) => string;
};

const INSIGHTS = [
  {
    title: 'Bill Payment Reminder',
    description:
      'Your electricity bill of $142 is due in 3 days. Set up autopay to never miss a payment.',
    prompt: 'Set up autopay on the electricity bill.',
  },
  {
    title: 'Subscription Alert',
    description:
      'You have 3 unused subscriptions costing $45/month. Consider cancelling to save $540/year.',
    prompt: 'Which of my subscriptions should I cancel first?',
  },
  {
    title: 'Tax Document Ready',
    description:
      'Your W-2 form has been uploaded. I can help you organise your tax documents.',
    prompt: 'Help me organise tax documents from this year.',
  },
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

/** Reusable hover-press scale wrapper (Brief §5.1). */
function PressableCard({
  children,
  onPress,
  onLongPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: object;
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

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={420}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

function ConnectedAccountsTile({
  onAskAi,
}: {
  onAskAi: (prompt: string) => void;
}) {
  const router = useRouter();
  const t = useTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
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
    <PressableCard
      onPress={() => router.push('/banks' as never)}
      onLongPress={() => onAskAi('Summarise my account balances.')}
      style={styles.banksTile}
    >
      <View style={styles.banksTileHeader}>
        <View style={styles.banksTileIcon}>
          <Text style={styles.banksTileGlyph}>B</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.banksTileLabel}>Connected Accounts</Text>
          {loading ? (
            <ActivityIndicator color={t.accent} style={{ marginTop: 6 }} />
          ) : isEmpty ? (
            <Text style={styles.banksTileEmpty}>
              Connect a bank — we&apos;ll handle the honey trail.
            </Text>
          ) : (
            <Text style={styles.banksTileValue}>{formatCurrency(totalBalance)}</Text>
          )}
        </View>
        <AskAiButton
          variant="icon"
          onPress={() => onAskAi('Summarise my account balances.')}
        />
      </View>
      <Text style={styles.banksTileCta}>
        {isEmpty
          ? 'Connect a bank →'
          : `${count} ${count === 1 ? 'account' : 'accounts'} · Manage →`}
      </Text>
    </PressableCard>
  );
}

function RecentTransactionsTile({
  onAskAi,
}: {
  onAskAi: (prompt: string) => void;
}) {
  const router = useRouter();
  const t = useTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
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
          <ActivityIndicator color={t.accent} />
          <Text style={styles.loadingHint}>Following the honey trail…</Text>
        </View>
      ) : !items || items.length === 0 ? (
        <View style={styles.txnEmpty}>
          <Text style={styles.txnEmptyText}>
            Connect a bank to see what&apos;s been flowing.
          </Text>
        </View>
      ) : (
        items.map((txn) => {
          const amt = toNumber(txn.amount);
          const isInflow = amt < 0;
          return (
            <PressableCard
              key={txn.id}
              onPress={() => router.push('/transactions' as never)}
              onLongPress={() =>
                onAskAi(`Why did the "${txn.merchantName || txn.name}" transaction repeat?`)
              }
              style={[styles.txnRow, txn.pending && { opacity: 0.6 }]}
            >
              <View style={styles.txnRowIcon}>
                <Text style={styles.txnRowIconText}>{isInflow ? '↓' : '↑'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txnMerchant} numberOfLines={1}>
                  {txn.merchantName || txn.name}
                </Text>
                <Text style={styles.txnMeta} numberOfLines={1}>
                  {new Date(txn.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {txn.category ? ` · ${txn.category}` : ''}
                </Text>
              </View>
              <Text style={[styles.txnAmount, isInflow && { color: t.success }]}>
                {isInflow ? '+' : '−'}
                {formatCurrency(Math.abs(amt), txn.isoCurrencyCode || 'USD')}
              </Text>
              <AskAiButton
                variant="icon"
                onPress={() =>
                  onAskAi(
                    `Why did the "${txn.merchantName || txn.name}" transaction repeat?`,
                  )
                }
                style={{ marginLeft: spacing.sm }}
              />
            </PressableCard>
          );
        })
      )}
    </View>
  );
}

function initialsFromName(name: string | null | undefined): string {
  if (!name) return '··';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '··';
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '··').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function firstName(name: string | null | undefined): string {
  if (!name) return 'friend';
  const first = name.trim().split(/\s+/)[0];
  return first || 'friend';
}

export default function HomeScreen() {
  const t = useTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const sheet = useAiSheet('Help me with my life admin today.');
  const { user } = useAuth();
  const router = useRouter();

  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  });

  // Google triage is opt-in — only show when linked + the API has
  // returned a payload. The query fails soft (retry: false) so an
  // unlinked user never sees a spinner here.
  const googleQuery = useQuery({
    queryKey: ['google', 'status'],
    queryFn: getGoogleStatus,
    retry: false,
  });
  const googleLinked = googleQuery.data?.linked === true;
  const inboxTriage = googleQuery.data?.inboxTriage ?? null;

  // Pull-to-refresh on Dashboard also re-polls Gmail (best-effort —
  // failures are silent because the inbox triage card already
  // tolerates an empty payload).
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        dashboardQuery.refetch(),
        googleQuery.refetch(),
        googleLinked ? pollGmail() : Promise.resolve(),
      ]);
      queryClient.invalidateQueries({ queryKey: ['google'] });
    } finally {
      setRefreshing(false);
    }
  };

  const data = dashboardQuery.data;
  const todayTasks = data?.todayTasks ?? [];
  const allDone = todayTasks.length === 0;

  const stats: Stat[] = [
    { label: 'Pending Tasks', value: data?.pendingTasks ?? 0, accent: false },
    {
      label: 'Bills due this week',
      value: data?.billsDueSoon?.length ?? 0,
      accent: true,
    },
    {
      label: 'Subscriptions',
      value: data?.totalMonthlySubs ?? 0,
      accent: false,
      format: (n) => `$${Math.round(n)}`,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{firstName(user?.name)}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => router.push('/(tabs)/settings' as never)}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Text style={styles.avatarText}>{initialsFromName(user?.name)}</Text>
          </TouchableOpacity>
        </View>

        {/* Hero — Ask BillBee input. Wrapped in a glow container that
            paints a soft gold radial-ish bloom behind the bar (D4). */}
        <View style={styles.hero}>
          <View style={styles.heroGlowWrap} pointerEvents="box-none">
            {/* Three concentric gold layers approximate a radial bloom
                without true RN blur. Lower opacity outer rings give a
                falloff illusion. */}
            <View style={[styles.heroGlowLayer, styles.heroGlowOuter]} pointerEvents="none" />
            <View style={[styles.heroGlowLayer, styles.heroGlowMid]} pointerEvents="none" />
            <View style={[styles.heroGlowLayer, styles.heroGlowInner]} pointerEvents="none" />
            <Pressable
              onPress={() =>
                sheet.open(
                  "Ask anything about your bills, tasks, or money…",
                )
              }
              style={styles.heroBar}
              accessibilityRole="button"
              accessibilityLabel="Ask BillBee"
            >
              <SparkleIcon size={20} color={t.accent} />
              <Text style={styles.heroPlaceholder}>
                Ask BillBee about your bills, tasks, or money…
              </Text>
              <View style={styles.heroSubmit}>
                <Text style={styles.heroSubmitArrow}>↑</Text>
              </View>
            </Pressable>
          </View>
          <Text style={styles.heroHelper}>
            What&apos;s worth your time today?
          </Text>
        </View>

        {/* Inbox Triage — Google integration. Surfaces only when the
            user has connected Google + the API returned an inboxTriage
            payload. Sits above the stats grid so the bee's first
            morning report is what you see. */}
        {googleLinked && inboxTriage && (
          <View style={styles.section}>
            <InboxTriageCard triage={inboxTriage} />
          </View>
        )}

        {/* Stats Grid — single gold accent on most-actionable. Numbers
            count up from 0 → final on mount (B6). */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View
              key={index}
              style={[styles.statCard, stat.accent && styles.statCardAccent]}
            >
              <Text style={styles.statLabel}>{stat.label}</Text>
              <AnimatedNumber
                value={stat.value}
                format={stat.format}
                style={[styles.statValue, stat.accent && styles.statValueAccent]}
              />
            </View>
          ))}
        </View>

        {/* Banking widgets — live data */}
        <View style={styles.section}>
          <ConnectedAccountsTile onAskAi={sheet.open} />
        </View>
        <RecentTransactionsTile onAskAi={sheet.open} />

        {/* AI Insights */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AI Insights</Text>
            <SparkleIcon size={18} color={t.accent} />
          </View>
          {INSIGHTS.map((insight, index) => (
            <PressableCard
              key={index}
              onLongPress={() => sheet.open(insight.prompt)}
              style={styles.insightCard}
            >
              <View style={styles.insightBorder} />
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDesc}>{insight.description}</Text>
                <View style={styles.insightFooter}>
                  <AskAiButton
                    variant="chip"
                    label="Ask follow-up"
                    onPress={() => sheet.open(insight.prompt)}
                  />
                </View>
              </View>
            </PressableCard>
          ))}
        </View>

        {/* Today's Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s Tasks</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/tasks' as never)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {dashboardQuery.isLoading ? (
            <View style={styles.emptyTasks}>
              <ActivityIndicator color={t.accent} />
              <Text style={styles.emptyDesc}>Loading the hive…</Text>
            </View>
          ) : allDone ? (
            <View style={styles.emptyTasks}>
              {/* Empty-state mascot: breathing + gentle float so the
                  inbox-zero moment feels alive, not just a static image. */}
              <BreathingBee>
                <FloatingBee>
                  <BeeSleeping size={84} />
                </FloatingBee>
              </BreathingBee>
              <Text style={styles.emptyTitle}>Inbox zero unlocked</Text>
              <Text style={styles.emptyDesc}>
                Nothing on the to-do list. Free as a bee.
              </Text>
            </View>
          ) : (
            todayTasks.map((task) => {
              const done = task.status === 'COMPLETED';
              return (
                <PressableCard
                  key={task.id}
                  onPress={() => router.push('/(tabs)/tasks' as never)}
                  onLongPress={() =>
                    sheet.open(`Break "${task.title}" into steps for me.`)
                  }
                  style={styles.taskCard}
                >
                  <View style={[styles.checkbox, done && styles.checkboxDone]}>
                    {done && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text
                    style={[styles.taskTitle, done && styles.taskTitleDone]}
                  >
                    {task.title}
                  </Text>
                  <AskAiButton
                    variant="icon"
                    onPress={() =>
                      sheet.open(`Break "${task.title}" into steps for me.`)
                    }
                  />
                </PressableCard>
              );
            })
          )}
        </View>

        {/* Footer mascot — one-shot entrance on first paint, then idle. */}
        <View style={styles.footerMascot}>
          <BeeEntrance>
            <BreathingBee>
              <FloatingBee>
                <BeeStanding size={64} />
              </FloatingBee>
            </BreathingBee>
          </BeeEntrance>
          <Text style={styles.footerMascotText}>
            Tucked away safely.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <AiBottomSheet
        visible={sheet.visible}
        onClose={sheet.close}
        initialPrompt={sheet.prompt}
        suggestions={[
          'What needs my attention today?',
          'Why did my electric bill go up?',
          'Cancel my unused subscriptions.',
        ]}
      />
    </View>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: spacing.lg,
  },
  headerLeft: { flex: 1 },
  greeting: {
    fontSize: 15,
    color: t.textMuted,
    fontWeight: '400',
  },
  userName: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    color: t.text,
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: t.text,
    fontSize: 16,
    fontWeight: '700',
  },
  hero: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  heroGlowWrap: {
    position: 'relative',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  heroGlowLayer: {
    position: 'absolute',
    backgroundColor: t.accent,
    alignSelf: 'center',
  },
  heroGlowOuter: {
    width: 360,
    height: 360,
    borderRadius: 180,
    opacity: 0.06,
    top: -130,
  },
  heroGlowMid: {
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.10,
    top: -78,
  },
  heroGlowInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.15,
    top: -38,
  },
  heroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: t.surface,
    borderWidth: 2,
    borderColor: t.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  heroPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: t.textSubtle,
    fontWeight: '500',
  },
  heroSubmit: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: t.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSubmitArrow: {
    fontSize: 18,
    fontWeight: '700',
    color: t.textOnAccent,
  },
  heroHelper: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: '500',
    color: t.textMuted,
    paddingHorizontal: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: t.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: t.border,
  },
  statCardAccent: {
    borderColor: t.accent,
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: t.textMuted,
    textTransform: 'uppercase',
  },
  statValue: {
    marginTop: spacing.sm,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: t.text,
  },
  statValueAccent: {
    color: t.text,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    color: t.text,
  },
  seeAll: {
    fontSize: 13,
    color: t.text,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: t.surface,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: t.border,
  },
  insightBorder: {
    width: 4,
    backgroundColor: t.accent,
  },
  insightContent: {
    flex: 1,
    padding: spacing.lg,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: t.text,
    marginBottom: spacing.xs,
  },
  insightDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: t.textMuted,
    marginBottom: spacing.md,
  },
  insightFooter: {
    flexDirection: 'row',
  },
  emptyTasks: {
    backgroundColor: t.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: t.border,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: t.text,
  },
  emptyDesc: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: t.textMuted,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: t.border,
    gap: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: t.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: t.accent,
    borderColor: t.accent,
  },
  checkmark: {
    color: t.textOnAccent,
    fontSize: 14,
    fontWeight: '700',
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: t.text,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: t.textMuted,
  },
  banksTile: {
    backgroundColor: t.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: t.border,
  },
  banksTileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  banksTileIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: t.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banksTileGlyph: {
    fontSize: 18,
    fontWeight: '700',
    color: t.text,
  },
  banksTileLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: t.textMuted,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  banksTileValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: t.text,
    marginTop: spacing.xs,
  },
  banksTileEmpty: {
    fontSize: 14,
    fontWeight: '500',
    color: t.text,
    marginTop: spacing.xs,
  },
  banksTileCta: {
    fontSize: 13,
    fontWeight: '600',
    color: t.text,
    marginTop: spacing.md,
  },
  txnSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
  },
  txnLoadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingHint: {
    fontSize: 12,
    color: t.textMuted,
    fontWeight: '500',
  },
  txnEmpty: {
    backgroundColor: t.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: t.border,
  },
  txnEmptyText: {
    fontSize: 13,
    color: t.textMuted,
    textAlign: 'center',
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: t.border,
  },
  txnRowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: t.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnRowIconText: { fontSize: 14, fontWeight: '700', color: t.textMuted },
  txnMerchant: { fontSize: 14, fontWeight: '600', color: t.text },
  txnMeta: { fontSize: 11, color: t.textSubtle, marginTop: 2 },
  txnAmount: { fontSize: 14, fontWeight: '700', color: t.text },
  footerMascot: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerMascotText: {
    fontSize: 13,
    color: t.textSubtle,
    fontWeight: '500',
  },
  bottomSpacer: { height: 80 },
});
}

type Styles = ReturnType<typeof makeStyles>;

