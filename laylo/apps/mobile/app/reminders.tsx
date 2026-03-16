import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

// ─── Types ──────────────────────────────────────────────────────────────────

type ReminderStatus = 'pending' | 'dismissed';
type LinkedType = 'Document' | 'Appointment' | 'Bill' | 'Subscription' | 'Task' | 'None';
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

// ─── Linked Type Config ─────────────────────────────────────────────────────

const LINKED_CONFIG: Record<LinkedType, { bg: string; text: string; emoji: string }> = {
  Document:     { bg: '#E0E7FF', text: '#4F46E5', emoji: '📄' },
  Appointment:  { bg: '#F3E8FF', text: '#7C3AED', emoji: '📅' },
  Bill:         { bg: '#FEF3C7', text: '#D97706', emoji: '💳' },
  Subscription: { bg: '#FCE7F3', text: '#DB2777', emoji: '🔄' },
  Task:         { bg: '#DCFCE7', text: '#16A34A', emoji: '✅' },
  None:         { bg: '#F3F4F6', text: '#6B7280', emoji: '🔔' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  const min = m.toString().padStart(2, '0');
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()} \u2014 ${hour}:${min} ${ampm}`;
}

// ─── Demo Data ──────────────────────────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────────────────

export default function RemindersScreen() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Pending');

  const filteredReminders = useMemo(() => {
    let filtered = reminders;
    if (activeFilter === 'Pending') {
      filtered = reminders.filter((r) => r.status === 'pending');
    } else if (activeFilter === 'Dismissed') {
      filtered = reminders.filter((r) => r.status === 'dismissed');
    }
    return [...filtered].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  }, [reminders, activeFilter]);

  const pendingCount = useMemo(() => reminders.filter((r) => r.status === 'pending').length, [reminders]);
  const dismissedCount = useMemo(() => reminders.filter((r) => r.status === 'dismissed').length, [reminders]);

  const filterCounts: Record<FilterTab, number> = {
    Pending: pendingCount,
    Dismissed: dismissedCount,
    All: reminders.length,
  };

  const dismissReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'dismissed' as ReminderStatus } : r))
    );
  };

  const renderReminder = ({ item }: { item: Reminder }) => {
    const config = LINKED_CONFIG[item.linkedType];
    const isPending = item.status === 'pending';

    return (
      <View style={[styles.card, !isPending && styles.cardDismissed]}>
        <View style={styles.cardRow}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
            <Text style={styles.iconEmoji}>{config.emoji}</Text>
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, !isPending && styles.cardTitleDismissed]}>
              {item.title}
            </Text>

            <Text style={styles.cardDateTime}>
              {formatDateTime(item.dateTime)}
            </Text>

            <View style={styles.badgeRow}>
              {item.recurring && (
                <View style={[styles.badge, { backgroundColor: '#CCFBF1' }]}>
                  <Text style={[styles.badgeText, { color: '#0D9488' }]}>
                    🔁 {item.recurrenceRule}
                  </Text>
                </View>
              )}
              {item.linkedType !== 'None' && (
                <View style={[styles.badge, { backgroundColor: config.bg }]}>
                  <Text style={[styles.badgeText, { color: config.text }]}>
                    {config.emoji} {item.linkedType}
                  </Text>
                </View>
              )}
              <View style={[styles.badge, {
                backgroundColor: isPending ? '#FEF3C7' : '#DCFCE7',
              }]}>
                <Text style={[styles.badgeText, {
                  color: isPending ? '#D97706' : '#16A34A',
                }]}>
                  {isPending ? 'Pending' : 'Dismissed'}
                </Text>
              </View>
            </View>
          </View>

          {/* Dismiss button */}
          {isPending && (
            <TouchableOpacity
              onPress={() => dismissReminder(item.id)}
              style={styles.dismissButton}
            >
              <Text style={styles.dismissIcon}>✓</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIconText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reminders</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleRow}>
        <Text style={styles.subtitleEmoji}>🔔</Text>
        <Text style={styles.subtitle}>{pendingCount} pending reminder{pendingCount !== 1 ? 's' : ''}</Text>
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
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {tab}
              </Text>
              <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                  {filterCounts[tab]}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Empty State */}
      {filteredReminders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>
            {activeFilter === 'Pending'
              ? 'No pending reminders'
              : activeFilter === 'Dismissed'
              ? 'No dismissed reminders'
              : 'No reminders yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter === 'Pending'
              ? "You're all caught up!"
              : 'Create a reminder to get started.'}
          </Text>
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
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIconText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  addButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: -1,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  subtitleEmoji: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterCount: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  filterCountTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  cardDismissed: {
    opacity: 0.55,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 20,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardTitleDismissed: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  cardDateTime: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6366F1',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dismissButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
