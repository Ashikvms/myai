/**
 * Reminders — Phase 3b restyle.
 *
 * Reached from the Vault hub. Black + gold tokens, neutral category
 * chips, AskAi sparkle on every card, BeeMail empty state.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { tokens, radius, spacing } from '../src/lib/tokens';
import { AiBottomSheet, AskAiButton, useAiSheet } from '../src/components/ai';
import { BeeMail } from '../src/components/illustrations/bee';
import { StaggeredListItem } from '../src/components/motion/staggered-list-item';

type ReminderStatus = 'pending' | 'dismissed';
type LinkedType =
  | 'Document'
  | 'Appointment'
  | 'Bill'
  | 'Subscription'
  | 'Task'
  | 'None';
type FilterTab = 'Pending' | 'Dismissed' | 'All';

interface Reminder {
  id: string;
  title: string;
  dateTime: Date;
  linkedType: LinkedType;
  recurring: boolean;
  recurrenceRule?: string;
  status: ReminderStatus;
}

const LINKED_GLYPH: Record<LinkedType, string> = {
  Document: 'D',
  Appointment: 'A',
  Bill: '$',
  Subscription: 'S',
  Task: 'T',
  None: '·',
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function setTime(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function formatDateTime(date: Date): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  const min = m.toString().padStart(2, '0');
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()} — ${hour}:${min} ${ampm}`;
}

const today = new Date();

const INITIAL_REMINDERS: Reminder[] = [
  {
    id: 'r1',
    title: 'Renew vehicle registration',
    dateTime: setTime(addDays(today, 60), 9, 0),
    linkedType: 'Document',
    recurring: true,
    recurrenceRule: 'Annually',
    status: 'pending',
  },
  {
    id: 'r2',
    title: 'Pay electricity bill',
    dateTime: setTime(addDays(today, 1), 10, 0),
    linkedType: 'Bill',
    recurring: false,
    status: 'pending',
  },
  {
    id: 'r3',
    title: 'Passport renewal deadline',
    dateTime: setTime(addMonths(today, 5), 9, 0),
    linkedType: 'Document',
    recurring: false,
    status: 'pending',
  },
  {
    id: 'r4',
    title: 'Dentist appointment tomorrow',
    dateTime: setTime(addDays(today, 1), 8, 0),
    linkedType: 'Appointment',
    recurring: false,
    status: 'pending',
  },
  {
    id: 'r5',
    title: 'Review gym membership',
    dateTime: setTime(addDays(today, 2), 12, 0),
    linkedType: 'Subscription',
    recurring: false,
    status: 'pending',
  },
];

export default function RemindersScreen() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Pending');
  const sheet = useAiSheet('Help me with my reminders.');

  const filteredReminders = useMemo(() => {
    let filtered = reminders;
    if (activeFilter === 'Pending') {
      filtered = reminders.filter((r) => r.status === 'pending');
    } else if (activeFilter === 'Dismissed') {
      filtered = reminders.filter((r) => r.status === 'dismissed');
    }
    return [...filtered].sort(
      (a, b) => a.dateTime.getTime() - b.dateTime.getTime(),
    );
  }, [reminders, activeFilter]);

  const pendingCount = useMemo(
    () => reminders.filter((r) => r.status === 'pending').length,
    [reminders],
  );
  const dismissedCount = useMemo(
    () => reminders.filter((r) => r.status === 'dismissed').length,
    [reminders],
  );

  const filterCounts: Record<FilterTab, number> = {
    Pending: pendingCount,
    Dismissed: dismissedCount,
    All: reminders.length,
  };

  const dismissReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'dismissed' as ReminderStatus } : r)),
    );
  };

  const renderReminder = ({
    item,
    index,
  }: {
    item: Reminder;
    index: number;
  }) => {
    const isPending = item.status === 'pending';
    return (
      <StaggeredListItem index={index}>
      <PressableReminderCard
        dismissed={!isPending}
        onLongPress={() => sheet.open(`Why was the reminder "${item.title}" set?`)}
      >
        <View style={styles.cardRow}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>{LINKED_GLYPH[item.linkedType]}</Text>
          </View>
          <View style={styles.cardContent}>
            <Text
              style={[
                styles.cardTitle,
                !isPending && styles.cardTitleDismissed,
              ]}
            >
              {item.title}
            </Text>
            <Text style={styles.cardDateTime}>{formatDateTime(item.dateTime)}</Text>
            <View style={styles.badgeRow}>
              {item.recurring && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>↻ {item.recurrenceRule}</Text>
                </View>
              )}
              {item.linkedType !== 'None' && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.linkedType}</Text>
                </View>
              )}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {isPending ? 'Pending' : 'Dismissed'}
                </Text>
              </View>
            </View>
          </View>
          {isPending ? (
            <TouchableOpacity
              onPress={() => dismissReminder(item.id)}
              style={styles.dismissButton}
              hitSlop={8}
              accessibilityLabel="Mark as done"
            >
              <Text style={styles.dismissIcon}>✓</Text>
            </TouchableOpacity>
          ) : (
            <AskAiButton
              variant="icon"
              onPress={() =>
                sheet.open(`Why was the reminder "${item.title}" set?`)
              }
            />
          )}
        </View>
      </PressableReminderCard>
      </StaggeredListItem>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.eyebrow}>YOUR VAULT</Text>
          <Text style={styles.headerTitle}>Reminders</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(['Pending', 'Dismissed', 'All'] as FilterTab[]).map((tab) => {
          const isActive = activeFilter === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(tab)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {tab}
              </Text>
              <View
                style={[styles.filterCount, isActive && styles.filterCountActive]}
              >
                <Text
                  style={[
                    styles.filterCountText,
                    isActive && styles.filterCountTextActive,
                  ]}
                >
                  {filterCounts[tab]}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {filteredReminders.length === 0 ? (
        <View style={styles.emptyState}>
          <BeeMail size={120} />
          <Text style={styles.emptyTitle}>
            All quiet on the notification front
          </Text>
          <Text style={styles.emptySubtitle}>
            We&apos;ll buzz you when something needs attention.
          </Text>
          <View style={{ marginTop: spacing.lg }}>
            <AskAiButton
              variant="chip"
              label="Ask Laylo to add something"
              onPress={() => sheet.open('Help me set a new reminder.')}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredReminders}
          keyExtractor={(item) => item.id}
          renderItem={renderReminder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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

function PressableReminderCard({
  children,
  onLongPress,
  dismissed,
}: {
  children: React.ReactNode;
  onLongPress?: () => void;
  dismissed?: boolean;
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
      onLongPress={onLongPress}
      delayLongPress={420}
    >
      <Animated.View
        style={[styles.card, dismissed && styles.cardDismissed, animatedStyle]}
      >
        {children}
      </Animated.View>
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: tokens.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: tokens.textOnAccent,
    marginTop: -1,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md - 2,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: tokens.border,
  },
  filterChipActive: {
    backgroundColor: tokens.text,
    borderColor: tokens.text,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.textMuted,
  },
  filterChipTextActive: {
    color: tokens.bg,
  },
  filterCount: {
    backgroundColor: tokens.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: tokens.textMuted,
  },
  filterCountTextActive: {
    color: tokens.bg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md - 2,
    paddingBottom: 32,
    gap: spacing.md,
  },
  card: {
    backgroundColor: tokens.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: tokens.border,
  },
  cardDismissed: {
    opacity: 0.55,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: tokens.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
    fontWeight: '700',
    color: tokens.text,
  },
  cardContent: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: tokens.text,
    marginBottom: spacing.xs,
  },
  cardTitleDismissed: {
    textDecorationLine: 'line-through',
    color: tokens.textMuted,
  },
  cardDateTime: {
    fontSize: 12,
    fontWeight: '500',
    color: tokens.textMuted,
    marginBottom: spacing.sm,
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
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: tokens.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: tokens.textOnAccent,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    fontSize: 16,
    fontWeight: '600',
    color: tokens.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: tokens.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
