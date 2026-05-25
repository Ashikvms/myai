/**
 * Appointments — Phase 3b restyle.
 *
 * Reached from the Vault hub. Black + gold tokens, neutral category
 * chips, AskAi sparkle on every card. Empty state uses the standing bee.
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
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { useTokens, type Tokens, radius, spacing } from '../src/lib/tokens';
import { AiBottomSheet, AskAiButton, useAiSheet } from '../src/components/ai';
import { BeeStanding } from '../src/components/illustrations/bee';
import { StaggeredListItem } from '../src/components/motion/staggered-list-item';
import {
  listAppointments,
  type ApiAppointment,
} from '../src/lib/api/resources';

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
  /** When 'google', show the small "G" badge next to the title. */
  source: 'manual' | 'google' | null;
  externalUrl: string | null;
}

const CATEGORY_GLYPH: Record<ApptCategory, string> = {
  Health: 'M',
  Finance: '$',
  Car: 'C',
  Personal: 'P',
  Work: 'W',
  Other: 'O',
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

function toCategory(c: string | null | undefined): ApptCategory {
  if (!c) return 'Other';
  const allowed: ApptCategory[] = [
    'Health',
    'Finance',
    'Car',
    'Personal',
    'Work',
    'Other',
  ];
  return allowed.includes(c as ApptCategory) ? (c as ApptCategory) : 'Other';
}

function adapt(a: ApiAppointment): Appointment {
  return {
    id: a.id,
    title: a.title,
    dateTime: new Date(a.dateTime),
    endTime: a.endTime ? new Date(a.endTime) : undefined,
    location: a.location ?? '',
    category: toCategory(a.category),
    reminderMinutes: a.reminderMinutes ?? 60,
    notes: a.notes ?? undefined,
    source: a.source ?? null,
    externalUrl: a.externalUrl ?? null,
  };
}

export default function AppointmentsScreen() {
  const t = useTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const sheet = useAiSheet('Help me prep for my next appointment.');

  const appointmentsQuery = useQuery({
    queryKey: ['appointments'],
    queryFn: listAppointments,
  });

  const appointments = useMemo(
    () =>
      (appointmentsQuery.data ?? [])
        .map(adapt)
        .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime()),
    [appointmentsQuery.data],
  );

  const renderAppointment = ({
    item,
    index,
  }: {
    item: Appointment;
    index: number;
  }) => {
    const isLast = index === appointments.length - 1;
    return (
      <StaggeredListItem index={index} style={styles.timelineItem}>
        <View style={styles.timelineLeft}>
          <View style={styles.timelineDot} />
          {!isLast && <View style={styles.timelineLine} />}
        </View>

        <PressableApptCard
          onLongPress={() => sheet.open(`Help me prep for "${item.title}".`)}
          styles={styles}
        >
          <View style={styles.cardTopRow}>
            <View style={styles.cardAvatar}>
              <Text style={styles.cardAvatarText}>
                {CATEGORY_GLYPH[item.category]}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.source === 'google' && (
                  <View
                    style={styles.googleBadge}
                    accessibilityLabel="Synced from Google Calendar"
                  >
                    <Text style={styles.googleBadgeText}>G</Text>
                  </View>
                )}
              </View>
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
          <Text style={styles.headerTitle}>Appointments</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {appointmentsQuery.isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={t.accent} />
          <Text style={[styles.emptyTitle, { marginTop: spacing.md }]}>
            Loading the hive…
          </Text>
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.emptyState}>
          <BeeStanding size={120} />
          <Text style={styles.emptyTitle}>
            Calendar&apos;s clear. Enjoy the open hive.
          </Text>
          <View style={{ marginTop: spacing.lg }}>
            <AskAiButton
              variant="chip"
              label="Ask BillBee to add something"
              onPress={() => sheet.open('Help me schedule a new appointment.')}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointment}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={appointmentsQuery.isFetching}
          onRefresh={() => appointmentsQuery.refetch()}
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
  styles,
}: {
  children: React.ReactNode;
  onLongPress?: () => void;
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
      style={{ flex: 1 }}
    >
      <Animated.View style={[styles.card, animatedStyle]}>{children}</Animated.View>
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
    backgroundColor: t.accent,
    marginTop: 20,
    borderWidth: 2,
    borderColor: t.bg,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: t.border,
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: t.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: t.border,
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
    backgroundColor: t.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: t.text,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: t.text,
    marginBottom: 2,
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  googleBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: t.surface2,
    borderWidth: 1,
    borderColor: t.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: t.text,
    lineHeight: 12,
  },
  cardDateTime: {
    fontSize: 12,
    fontWeight: '500',
    color: t.textMuted,
  },
  locationText: {
    fontSize: 13,
    color: t.textSubtle,
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
    backgroundColor: t.surface2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: t.text,
  },
  notes: {
    fontSize: 13,
    color: t.textMuted,
    lineHeight: 18,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: t.border,
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
    color: t.text,
    textAlign: 'center',
  },
});
}

type Styles = ReturnType<typeof makeStyles>;

