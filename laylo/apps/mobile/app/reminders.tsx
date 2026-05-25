/**
 * Reminders — Phase 3b restyle.
 *
 * Reached from the Vault hub. Black + gold tokens, neutral category
 * chips, AskAi sparkle on every card, BeeMail empty state.
 */
import React, { useMemo } from 'react';
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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTokens, type Tokens, radius, spacing } from '../src/lib/tokens';
import { AiBottomSheet, AskAiButton, useAiSheet } from '../src/components/ai';
import { BeeMail } from '../src/components/illustrations/bee';
import { StaggeredListItem } from '../src/components/motion/staggered-list-item';
import {
  dismissReminder as apiDismissReminder,
  listReminders,
  type ApiReminder,
} from '../src/lib/api/resources';

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

function toLinkedType(t: string | null | undefined): LinkedType {
  if (!t) return 'None';
  const allowed: LinkedType[] = [
    'Document',
    'Appointment',
    'Bill',
    'Subscription',
    'Task',
    'None',
  ];
  // API stores uppercase enums like 'BILL'; normalise to PascalCase.
  const normalised =
    t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  return (allowed as string[]).includes(normalised)
    ? (normalised as LinkedType)
    : 'None';
}

function adaptReminder(r: ApiReminder): Reminder {
  return {
    id: r.id,
    title: r.title,
    dateTime: new Date(r.dueAt),
    linkedType: toLinkedType(r.linkedType),
    recurring: r.recurring,
    recurrenceRule: r.recurrenceRule ?? undefined,
    status: r.status === 'DISMISSED' ? 'dismissed' : 'pending',
  };
}

export default function RemindersScreen() {
  const t = useTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const queryClient = useQueryClient();
  const remindersQuery = useQuery({
    queryKey: ['reminders'],
    queryFn: listReminders,
  });
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>('Pending');
  const sheet = useAiSheet('Help me with my reminders.');

  const reminders = useMemo(
    () => (remindersQuery.data ?? []).map(adaptReminder),
    [remindersQuery.data],
  );

  const dismissMutation = useMutation({
    mutationFn: (id: string) => apiDismissReminder(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['reminders'] });
      const prev = queryClient.getQueryData<ApiReminder[]>(['reminders']);
      queryClient.setQueryData<ApiReminder[]>(['reminders'], (old) =>
        (old ?? []).map((r) =>
          r.id === id ? { ...r, status: 'DISMISSED' as const } : r,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['reminders'], ctx.prev);
      Alert.alert('Hmm, sync stalled. Try again?');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

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
    dismissMutation.mutate(id);
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
        styles={styles}
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

      {remindersQuery.isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={t.accent} />
          <Text style={[styles.emptyTitle, { marginTop: spacing.md }]}>
            Loading the hive…
          </Text>
        </View>
      ) : filteredReminders.length === 0 ? (
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
              label="Ask BillBee to add something"
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
          refreshing={remindersQuery.isFetching}
          onRefresh={() => remindersQuery.refetch()}
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
  styles,
}: {
  children: React.ReactNode;
  onLongPress?: () => void;
  dismissed?: boolean;
  styles: Styles;
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: t.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: t.textOnAccent,
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
    borderColor: t.border,
  },
  filterChipActive: {
    backgroundColor: t.text,
    borderColor: t.text,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: t.textMuted,
  },
  filterChipTextActive: {
    color: t.bg,
  },
  filterCount: {
    backgroundColor: t.border,
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
    color: t.textMuted,
  },
  filterCountTextActive: {
    color: t.bg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md - 2,
    paddingBottom: 32,
    gap: spacing.md,
  },
  card: {
    backgroundColor: t.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: t.border,
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
    backgroundColor: t.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
    fontWeight: '700',
    color: t.text,
  },
  cardContent: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: t.text,
    marginBottom: spacing.xs,
  },
  cardTitleDismissed: {
    textDecorationLine: 'line-through',
    color: t.textMuted,
  },
  cardDateTime: {
    fontSize: 12,
    fontWeight: '500',
    color: t.textMuted,
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
    backgroundColor: t.surface2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: t.text,
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: t.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: t.textOnAccent,
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
    color: t.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: t.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
}

type Styles = ReturnType<typeof makeStyles>;

