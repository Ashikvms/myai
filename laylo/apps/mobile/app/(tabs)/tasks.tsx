/**
 * Tasks tab — Phase 3b restyle.
 *
 * Black + gold tokens, neutral priority badges (gold reserved for the
 * checkbox tick), AskAi sparkle on every row. Empty state uses the
 * sleeping bee with copy-bank wording.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tokens, radius, spacing } from '../../src/lib/tokens';
import {
  AiBottomSheet,
  AskAiButton,
  useAiSheet,
} from '../../src/components/ai';
import { BeeSleeping } from '../../src/components/illustrations/bee';
import { StaggeredListItem } from '../../src/components/motion/staggered-list-item';
import { SparkleBurst } from '../../src/components/celebrations/sparkle-burst';
import { InboxZeroOverlay } from '../../src/components/celebrations/inbox-zero-overlay';
import { markInboxZeroShown } from '../../src/lib/inbox-zero-flag';

const FILTERS = ['All', 'Today', 'Upcoming', 'Overdue', 'Completed'] as const;
type Filter = (typeof FILTERS)[number];

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  done: boolean;
}

const TASKS: Task[] = [
  {
    id: '1',
    title: 'Renew car insurance',
    description: 'Policy expires on March 30. Compare rates online first.',
    priority: 'high',
    dueDate: 'Mar 25',
    done: false,
  },
  {
    id: '2',
    title: 'Schedule dentist appointment',
    description: 'Annual checkup and cleaning. Call Dr. Smith’s office.',
    priority: 'medium',
    dueDate: 'Mar 20',
    done: false,
  },
  {
    id: '3',
    title: 'Pay electricity bill',
    description: 'Amount due: $142.50. Set up autopay after this.',
    priority: 'high',
    dueDate: 'Mar 18',
    done: true,
  },
  {
    id: '4',
    title: 'File tax returns',
    description: 'Gather W-2 and 1099 forms. Use TurboTax this year.',
    priority: 'high',
    dueDate: 'Apr 15',
    done: false,
  },
  {
    id: '5',
    title: 'Update passport',
    description: 'Current passport expires in June. Apply for renewal.',
    priority: 'medium',
    dueDate: 'Apr 1',
    done: false,
  },
  {
    id: '6',
    title: 'Cancel unused gym membership',
    description: 'Planet Fitness membership. $30/month savings.',
    priority: 'low',
    dueDate: 'Mar 31',
    done: false,
  },
];

function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  const label = priority.charAt(0).toUpperCase() + priority.slice(1);
  return (
    <View style={styles.priorityBadge}>
      <Text style={styles.priorityText}>{label}</Text>
    </View>
  );
}

/**
 * Animated checkbox — gold sweep on toggle. Brief §5.2.
 *
 * Adds a "sweep" check-stroke animation: when toggling done → true,
 * the gold fill paints in (opacity + scale) and the checkmark is
 * revealed by a quick scale-from-0 over 220ms. Honors reduced motion.
 */
function GoldCheckbox({ done, onPress }: { done: boolean; onPress: () => void }) {
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(done ? 1 : 0);
  const tickScale = useSharedValue(done ? 1 : 0);

  React.useEffect(() => {
    fill.value = withTiming(done ? 1 : 0, {
      duration: reduceMotion ? 0 : 200,
    });
    tickScale.value = withTiming(done ? 1 : 0, {
      duration: reduceMotion ? 0 : 220,
    });
  }, [done, reduceMotion, fill, tickScale]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: fill.value,
    transform: [{ scale: fill.value }],
  }));

  const tickStyle = useAnimatedStyle(() => ({
    opacity: tickScale.value,
    transform: [{ scale: tickScale.value }],
  }));

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <View style={styles.checkbox}>
        <Animated.View style={[styles.checkboxFill, fillStyle]} />
        {done && (
          <Animated.Text style={[styles.checkmark, tickStyle]}>✓</Animated.Text>
        )}
      </View>
    </Pressable>
  );
}

export default function TasksScreen() {
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [tasks, setTasks] = useState(TASKS);
  const sheet = useAiSheet('Help me plan my tasks today.');

  // Track which task just got celebrated so the burst plays once per
  // completion. Reset to null after the burst finishes (~700ms).
  const [burstTaskId, setBurstTaskId] = useState<string | null>(null);

  // Inbox-zero overlay (D3) — fires once per session when the active
  // (uncompleted) task count transitions from > 0 → 0.
  const [zeroOverlay, setZeroOverlay] = useState(false);
  const prevPendingRef = useRef<number>(
    tasks.filter((t) => !t.done).length,
  );

  useEffect(() => {
    const pending = tasks.filter((t) => !t.done).length;
    if (prevPendingRef.current > 0 && pending === 0) {
      // Just hit zero — celebrate, but only once per session.
      if (markInboxZeroShown()) {
        setZeroOverlay(true);
      }
    }
    prevPendingRef.current = pending;
  }, [tasks]);

  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === 'Completed') return task.done;
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Today') return !task.done;
    if (activeFilter === 'Upcoming') return !task.done;
    if (activeFilter === 'Overdue') return !task.done && task.priority === 'high';
    return true;
  });

  const toggleTask = (id: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      const becameDone = next.find((t) => t.id === id)?.done === true;
      if (becameDone) {
        setBurstTaskId(id);
        // Auto-clear the burst marker so it can replay on the next
        // completion (e.g. user re-checks a different task).
        setTimeout(() => {
          setBurstTaskId((curr) => (curr === id ? null : curr));
        }, 800);
      }
      return next;
    });
  };

  const renderTask = ({ item, index }: { item: Task; index: number }) => (
    <StaggeredListItem index={index}>
      <View style={{ position: 'relative' }}>
        <PressableTaskCard
          onLongPress={() => sheet.open(`Break "${item.title}" into steps for me.`)}
        >
          <GoldCheckbox done={item.done} onPress={() => toggleTask(item.id)} />
          <View style={styles.taskContent}>
            <View style={styles.taskTopRow}>
              <Text
                style={[styles.taskTitle, item.done && styles.taskTitleDone]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <PriorityBadge priority={item.priority} />
            </View>
            <Text style={styles.taskDesc} numberOfLines={1}>
              {item.description}
            </Text>
            <View style={styles.taskFooter}>
              <Text style={styles.taskDue}>📅 {item.dueDate}</Text>
              <AskAiButton
                variant="chip"
                label="Break into steps"
                onPress={() =>
                  sheet.open(`Break "${item.title}" into steps for me.`)
                }
              />
            </View>
          </View>
        </PressableTaskCard>
        {/* Celebration burst — fixed origin near the checkbox. */}
        <SparkleBurst
          active={burstTaskId === item.id}
          originX={28}
          originY={28}
          count={6}
        />
      </View>
    </StaggeredListItem>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>YOUR LIST</Text>
          <Text style={styles.headerTitle}>Tasks</Text>
        </View>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              activeFilter === filter && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(filter)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filter && styles.filterTextActive,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.taskList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <BeeSleeping size={120} />
            <Text style={styles.emptyText}>Inbox zero unlocked</Text>
            <Text style={styles.emptyDesc}>
              Nothing on the to-do list. Free as a bee.
            </Text>
            <View style={{ marginTop: spacing.lg }}>
              <AskAiButton
                variant="chip"
                label="Ask BillBee to add something"
                onPress={() => sheet.open('Add a new task to my list.')}
              />
            </View>
          </View>
        }
      />

      <AiBottomSheet
        visible={sheet.visible}
        onClose={sheet.close}
        initialPrompt={sheet.prompt}
        suggestions={[
          'What should I tackle first?',
          'Group these by category.',
          'Defer everything below high priority.',
        ]}
      />

      <InboxZeroOverlay
        visible={zeroOverlay}
        onDismiss={() => setZeroOverlay(false)}
      />
    </View>
  );
}

/** Wraps each task card with a press-scale animation. */
function PressableTaskCard({
  children,
  onLongPress,
}: {
  children: React.ReactNode;
  onLongPress?: () => void;
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
      <Animated.View style={[styles.taskCard, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: spacing.lg,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: tokens.textSubtle,
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    color: tokens.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: tokens.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: tokens.textOnAccent,
    fontSize: 24,
    fontWeight: '600',
    marginTop: -2,
  },
  filtersRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
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
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: tokens.textMuted,
  },
  filterTextActive: {
    color: tokens.bg,
  },
  taskList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    gap: spacing.md,
  },
  taskCard: {
    flexDirection: 'row',
    backgroundColor: tokens.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: tokens.border,
    gap: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: tokens.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 2,
  },
  checkboxFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.accent,
  },
  checkmark: {
    color: tokens.textOnAccent,
    fontSize: 14,
    fontWeight: '700',
  },
  taskContent: { flex: 1 },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: tokens.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: tokens.textMuted,
  },
  taskDesc: {
    fontSize: 13,
    color: tokens.textMuted,
    lineHeight: 18,
    marginBottom: spacing.md - 2,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskDue: {
    fontSize: 12,
    color: tokens.textSubtle,
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: tokens.surface2,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    color: tokens.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.lg,
    fontSize: 16,
    fontWeight: '600',
    color: tokens.text,
  },
  emptyDesc: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: tokens.textMuted,
    textAlign: 'center',
  },
});
