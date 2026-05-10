/**
 * Appointments — Phase 3b restyle.
 *
 * Reached from the Vault hub. Black + gold tokens, neutral category
 * chips, AskAi sparkle on every card. Empty state uses the standing bee.
 */
import React from 'react';
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
import { BeeStanding } from '../src/components/illustrations/bee';

type ApptCategory = 'Health' | 'Finance' | 'Car' | 'Personal' | 'Work' | 'Other';

interface Appointment {
  id: string;
  title: string;
  dateTime: Date;
  endTime?: Date;
  location: string;
  category: ApptCategory;
  reminderMinutes: number;
  notes?: string;
}

const CATEGORY_GLYPH: Record<ApptCategory, string> = {
  Health: 'M',
  Finance: '$',
  Car: 'C',
  Personal: 'P',
  Work: 'W',
  Other: 'O',
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
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
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()} at ${hour}:${min} ${ampm}`;
}

function formatTimeOnly(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  const min = m.toString().padStart(2, '0');
  return `${hour}:${min} ${ampm}`;
}

function getReminderLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min before`;
  const hrs = minutes / 60;
  return `${hrs} hr${hrs > 1 ? 's' : ''} before`;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

const APPOINTMENTS: Appointment[] = (
  [
    {
      id: 'a1',
      title: 'Tax Consultation',
      dateTime: setTime(addWeeks(today, 2), 10, 0),
      endTime: setTime(addWeeks(today, 2), 11, 0),
      location: 'H&R Block — 123 Main St',
      category: 'Finance',
      reminderMinutes: 60,
      notes: "Bring W-2, 1099 forms, and last year's return.",
    },
    {
      id: 'a2',
      title: 'Dentist Cleaning',
      dateTime: setTime(addWeeks(today, 3), 14, 30),
      endTime: setTime(addWeeks(today, 3), 15, 30),
      location: 'Bright Smile Dental — 456 Oak Ave',
      category: 'Health',
      reminderMinutes: 60,
      notes: 'Regular 6-month checkup and cleaning.',
    },
    {
      id: 'a3',
      title: 'Eye Exam',
      dateTime: setTime(addDays(today, 24), 9, 0),
      endTime: setTime(addDays(today, 24), 10, 0),
      location: 'Vision Center — 789 Elm Blvd',
      category: 'Health',
      reminderMinutes: 120,
      notes: 'Annual eye exam. Bring current glasses.',
    },
    {
      id: 'a4',
      title: 'Car Service — Oil Change',
      dateTime: setTime(addWeeks(today, 6), 8, 0),
      endTime: setTime(addWeeks(today, 6), 9, 30),
      location: 'Quick Lube — 321 Auto Way',
      category: 'Car',
      reminderMinutes: 60,
      notes: 'Oil change + tire rotation. 30k mile service.',
    },
  ] as Appointment[]
).sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

export default function AppointmentsScreen() {
  const router = useRouter();
  const sheet = useAiSheet('Help me prep for my next appointment.');

  const renderAppointment = ({
    item,
    index,
  }: {
    item: Appointment;
    index: number;
  }) => {
    const isLast = index === APPOINTMENTS.length - 1;
    return (
      <View style={styles.timelineItem}>
        <View style={styles.timelineLeft}>
          <View style={styles.timelineDot} />
          {!isLast && <View style={styles.timelineLine} />}
        </View>

        <PressableApptCard
          onLongPress={() => sheet.open(`Help me prep for "${item.title}".`)}
        >
          <View style={styles.cardTopRow}>
            <View style={styles.cardAvatar}>
              <Text style={styles.cardAvatarText}>
                {CATEGORY_GLYPH[item.category]}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDateTime}>
                {formatDateTime(item.dateTime)}
                {item.endTime ? ` – ${formatTimeOnly(item.endTime)}` : ''}
              </Text>
            </View>
            <AskAiButton
              variant="icon"
              onPress={() => sheet.open(`Help me prep for "${item.title}".`)}
            />
          </View>

          <Text style={styles.locationText} numberOfLines={1}>
            📍 {item.location}
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.category}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{getReminderLabel(item.reminderMinutes)}</Text>
            </View>
          </View>

          {item.notes && (
            <Text style={styles.notes} numberOfLines={2}>
              {item.notes}
            </Text>
          )}
        </PressableApptCard>
      </View>
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
          <Text style={styles.headerTitle}>Appointments</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {APPOINTMENTS.length === 0 ? (
        <View style={styles.emptyState}>
          <BeeStanding size={120} />
          <Text style={styles.emptyTitle}>
            Calendar&apos;s clear. Enjoy the open hive.
          </Text>
          <View style={{ marginTop: spacing.lg }}>
            <AskAiButton
              variant="chip"
              label="Ask Laylo to add something"
              onPress={() => sheet.open('Help me schedule a new appointment.')}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={APPOINTMENTS}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointment}
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

function PressableApptCard({
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
      style={{ flex: 1 }}
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 32,
  },
  timelineItem: { flexDirection: 'row' },
  timelineLeft: {
    alignItems: 'center',
    width: 24,
    marginRight: spacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: tokens.accent,
    marginTop: 20,
    borderWidth: 2,
    borderColor: tokens.bg,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: tokens.border,
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: tokens.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: tokens.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: tokens.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: tokens.text,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: tokens.text,
    marginBottom: 2,
  },
  cardDateTime: {
    fontSize: 12,
    fontWeight: '500',
    color: tokens.textMuted,
  },
  locationText: {
    fontSize: 13,
    color: tokens.textSubtle,
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: tokens.surface2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: tokens.text,
  },
  notes: {
    fontSize: 13,
    color: tokens.textMuted,
    lineHeight: 18,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    paddingTop: spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    fontSize: 16,
    fontWeight: '600',
    color: tokens.text,
    textAlign: 'center',
  },
});
