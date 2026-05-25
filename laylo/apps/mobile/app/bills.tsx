/**
 * Bills + Subscriptions — Phase 3b restyle.
 *
 * Reached from the Money hub. Black + gold tokens, neutral category
 * chips (icon-by-glyph, not by colour). AskAi sparkle on every card.
 * Empty state uses the standing bee.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { tokens, radius, spacing } from '../src/lib/tokens';
import {
  AiBottomSheet,
  AskAiButton,
  useAiSheet,
} from '../src/components/ai';
import { BeeStanding } from '../src/components/illustrations/bee';
import { StaggeredListItem } from '../src/components/motion/staggered-list-item';
import { GoldSweep } from '../src/components/celebrations/gold-sweep';
import {
  listBills,
  listSubscriptions,
  type ApiBill,
  type ApiSubscription,
} from '../src/lib/api/resources';

// ─── Types ──────────────────────────────────────────────────────────────────

type ActiveTab = 'bills' | 'subscriptions';
type BillCategory =
  | 'Housing'
  | 'Utilities'
  | 'Insurance'
  | 'Transportation'
  | 'Other';
type SubCategory =
  | 'Entertainment'
  | 'Health'
  | 'Tech'
  | 'Work'
  | 'Education'
  | 'Other';

interface Bill {
  id: string;
  name: string;
  category: BillCategory;
  amount: number;
  dueDate: string;
  autopay: boolean;
}

interface Subscription {
  id: string;
  name: string;
  category: SubCategory;
  amount: number;
  renewalDate: string;
  autopay: boolean;
}

const CATEGORY_GLYPH: Record<string, string> = {
  Housing: 'H',
  Utilities: 'U',
  Insurance: 'I',
  Transportation: 'T',
  Entertainment: 'E',
  Health: 'M',
  Tech: 'T',
  Work: 'W',
  Education: 'E',
  Other: 'O',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function daysBetween(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Adapters ───────────────────────────────────────────────────────────────

function toCategory(c: string | null | undefined, def: BillCategory): BillCategory {
  if (!c) return def;
  // API stores free-text or enum strings — try to match our restricted union.
  const allowed: BillCategory[] = [
    'Housing',
    'Utilities',
    'Insurance',
    'Transportation',
    'Other',
  ];
  return allowed.includes(c as BillCategory) ? (c as BillCategory) : def;
}

function toSubCategory(c: string | null | undefined): SubCategory {
  if (!c) return 'Other';
  const allowed: SubCategory[] = [
    'Entertainment',
    'Health',
    'Tech',
    'Work',
    'Education',
    'Other',
  ];
  return allowed.includes(c as SubCategory) ? (c as SubCategory) : 'Other';
}

function adaptBill(b: ApiBill): Bill {
  return {
    id: b.id,
    name: b.name,
    category: toCategory(b.category, 'Other'),
    amount: typeof b.amount === 'number' ? b.amount : parseFloat(String(b.amount)) || 0,
    dueDate: b.nextDueDate,
    autopay: b.autopay,
  };
}

function adaptSub(s: ApiSubscription): Subscription {
  const amt = typeof s.amount === 'number' ? s.amount : parseFloat(String(s.amount)) || 0;
  return {
    id: s.id,
    name: s.name,
    category: toSubCategory(s.category),
    amount: amt,
    renewalDate: s.renewalDate ?? s.nextDueDate ?? new Date().toISOString(),
    autopay: s.autopay,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function BillsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('bills');
  const sheet = useAiSheet('Help me with my bills.');

  const billsQuery = useQuery({ queryKey: ['bills'], queryFn: listBills });
  const subsQuery = useQuery({
    queryKey: ['subscriptions'],
    queryFn: listSubscriptions,
  });

  const bills = useMemo(
    () => (billsQuery.data ?? []).map(adaptBill),
    [billsQuery.data],
  );
  const subscriptions = useMemo(
    () => (subsQuery.data ?? []).map(adaptSub),
    [subsQuery.data],
  );

  // Track which bills the user has "paid" this session — and which one
  // is currently sweeping (B4). Sweep animates for 600ms then clears.
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [sweepingId, setSweepingId] = useState<string | null>(null);

  const markPaid = (id: string) => {
    setPaidIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setSweepingId(id);
    setTimeout(() => {
      setSweepingId((curr) => (curr === id ? null : curr));
    }, 700);
  };

  const billsTotal = useMemo(
    () => bills.reduce((sum, b) => sum + b.amount, 0),
    [bills],
  );
  const subsTotal = useMemo(
    () => subscriptions.reduce((sum, s) => sum + s.amount, 0),
    [subscriptions],
  );

  const renderBillCard = ({ item, index }: { item: Bill; index: number }) => {
    const days = daysBetween(item.dueDate);
    const isDueSoon = days >= 0 && days <= 3;
    const isPaid = paidIds.has(item.id);
    return (
      <StaggeredListItem index={index}>
      <PressableMoneyCard
        onPress={() => markPaid(item.id)}
        onLongPress={() =>
          sheet.open(`Why did the ${item.name} bill go up?`)
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardAvatar}>
              <Text style={styles.cardAvatarText}>
                {CATEGORY_GLYPH[item.category] ?? '·'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.name}</Text>
              <View style={styles.badgeRow}>
                <Badge label={item.category} />
                {item.autopay && <Badge label="Autopay" />}
                {isPaid && <Badge label="Paid" tone="success" />}
                {!isPaid && isDueSoon && <Badge label="Due soon" tone="danger" />}
              </View>
            </View>
          </View>
          <Text style={styles.cardAmount}>${item.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>
            {isPaid ? `Paid · ${formatDate(item.dueDate)}` : `Due: ${formatDate(item.dueDate)}`}
          </Text>
          <View style={styles.cardFooterRight}>
            {!isPaid && isDueSoon && (
              <Text style={styles.dueSoonText}>
                {days === 0
                  ? 'Due today'
                  : days === 1
                    ? 'Due tomorrow'
                    : `${days} days left`}
              </Text>
            )}
            <AskAiButton
              variant="icon"
              onPress={() => sheet.open(`Why did the ${item.name} bill go up?`)}
            />
          </View>
        </View>
        {/* Gold sweep + coin burst when this bill was just marked paid. */}
        <GoldSweep active={sweepingId === item.id} />
      </PressableMoneyCard>
      </StaggeredListItem>
    );
  };

  const renderSubCard = ({ item, index }: { item: Subscription; index: number }) => {
    const days = daysBetween(item.renewalDate);
    const isDueSoon = days >= 0 && days <= 3;
    return (
      <StaggeredListItem index={index}>
      <PressableMoneyCard
        onLongPress={() => sheet.open(`Is the ${item.name} subscription worth keeping?`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardAvatar}>
              <Text style={styles.cardAvatarText}>
                {CATEGORY_GLYPH[item.category] ?? '·'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.name}</Text>
              <View style={styles.badgeRow}>
                <Badge label={item.category} />
                {item.autopay && <Badge label="Autopay" />}
                {isDueSoon && <Badge label="Renews soon" tone="danger" />}
              </View>
            </View>
          </View>
          <Text style={styles.cardAmount}>${item.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>Renews: {formatDate(item.renewalDate)}</Text>
          <View style={styles.cardFooterRight}>
            {isDueSoon && (
              <Text style={styles.dueSoonText}>
                {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days left`}
              </Text>
            )}
            <AskAiButton
              variant="icon"
              onPress={() =>
                sheet.open(`Is the ${item.name} subscription worth keeping?`)
              }
            />
          </View>
        </View>
      </PressableMoneyCard>
      </StaggeredListItem>
    );
  };

  const isBills = activeTab === 'bills';
  const isLoading = isBills ? billsQuery.isLoading : subsQuery.isLoading;
  const isEmpty = (isBills ? bills.length : subscriptions.length) === 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.eyebrow}>YOUR MONEY</Text>
          <Text style={styles.headerTitle}>Bills & Subs</Text>
        </View>
        <AskAiButton
          variant="icon"
          onPress={() => sheet.open('Help me cut down my recurring spending.')}
        />
      </View>

      {/* Tab Toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, isBills && styles.tabActive]}
          onPress={() => setActiveTab('bills')}
        >
          <Text style={[styles.tabText, isBills && styles.tabTextActive]}>Bills</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, !isBills && styles.tabActive]}
          onPress={() => setActiveTab('subscriptions')}
        >
          <Text style={[styles.tabText, !isBills && styles.tabTextActive]}>
            Subscriptions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Monthly Bills</Text>
          <Text style={styles.summaryAmount}>${billsTotal.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardAccent]}>
          <Text style={styles.summaryLabel}>Monthly Subs</Text>
          <Text style={styles.summaryAmount}>${subsTotal.toFixed(2)}</Text>
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={tokens.accent} />
          <Text style={[styles.emptyTitle, { marginTop: spacing.md }]}>
            Loading the hive…
          </Text>
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyState}>
          <BeeStanding size={120} />
          <Text style={styles.emptyTitle}>
            {isBills
              ? 'Nothing buzzing here yet — add your first bill'
              : 'No subs swarming yet'}
          </Text>
          <View style={{ marginTop: spacing.lg }}>
            <AskAiButton
              variant="chip"
              label="Ask BillBee to add something"
              onPress={() => sheet.open('Add a new bill to my list.')}
            />
          </View>
        </View>
      ) : isBills ? (
        <FlatList<Bill>
          data={bills}
          keyExtractor={(item) => item.id}
          renderItem={renderBillCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={billsQuery.isFetching}
          onRefresh={() => billsQuery.refetch()}
        />
      ) : (
        <FlatList<Subscription>
          data={subscriptions}
          keyExtractor={(item) => item.id}
          renderItem={renderSubCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={subsQuery.isFetching}
          onRefresh={() => subsQuery.refetch()}
        />
      )}

      <AiBottomSheet
        visible={sheet.visible}
        onClose={sheet.close}
        initialPrompt={sheet.prompt}
      />
    </View>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone?: 'danger' | 'success';
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'danger' && { backgroundColor: 'rgba(239,68,68,0.10)' },
        tone === 'success' && { backgroundColor: 'rgba(34,197,94,0.12)' },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          tone === 'danger' && { color: tokens.danger },
          tone === 'success' && { color: tokens.success },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function PressableMoneyCard({
  children,
  onPress,
  onLongPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPressIn = () => {
    if (reduceMotion) return;
    scale.value = withSpring(0.97, { stiffness: 320, damping: 22 });
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
      <Animated.View style={[styles.card, animatedStyle]}>{children}</Animated.View>
    </Pressable>
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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: tokens.surface2,
    borderRadius: radius.sm,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm - 2,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: tokens.bg,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.textMuted,
  },
  tabTextActive: {
    color: tokens.text,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: tokens.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: tokens.border,
  },
  summaryCardAccent: {
    borderColor: tokens.accent,
  },
  summaryLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: tokens.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  summaryAmount: {
    marginTop: spacing.sm,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: tokens.text,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 32,
    gap: spacing.md,
  },
  card: {
    backgroundColor: tokens.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: tokens.border,
    // Clip the GoldSweep band so it doesn't bleed beyond the card edge.
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: spacing.md,
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: tokens.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.text,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: tokens.text,
    marginBottom: spacing.xs + 2,
  },
  cardAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: tokens.text,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: tokens.surface2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: tokens.text,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: tokens.border,
  },
  cardDate: {
    fontSize: 13,
    color: tokens.textSubtle,
    fontWeight: '500',
  },
  cardFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dueSoonText: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.danger,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    fontSize: 16,
    fontWeight: '600',
    color: tokens.text,
    textAlign: 'center',
  },
});
