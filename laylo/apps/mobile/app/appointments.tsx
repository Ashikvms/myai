import React from 'react';
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

// ─── Category Config ────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<ApptCategory, { bg: string; text: string; emoji: string }> = {
  Health:   { bg: '#FEE2E2', text: '#DC2626', emoji: '🏥' },
  Finance:  { bg: '#DCFCE7', text: '#16A34A', emoji: '💰' },
  Car:      { bg: '#FEF3C7', text: '#D97706', emoji: '🚗' },
  Personal: { bg: '#F3E8FF', text: '#7C3AED', emoji: '👤' },
  Work:     { bg: '#DBEAFE', text: '#2563EB', emoji: '💼' },
  Other:    { bg: '#F3F4F6', text: '#6B7280', emoji: '📅' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

// ─── Demo Data ──────────────────────────────────────────────────────────────

const today = new Date();
today.setHours(0, 0, 0, 0);

const APPOINTMENTS: Appointment[] = ([
  {
    id: 'a1',
    title: 'Tax Consultation',
    dateTime: setTime(addWeeks(today, 2), 10, 0),
    endTime: setTime(addWeeks(today, 2), 11, 0),
    location: 'H&R Block \u2014 123 Main St',
    category: 'Finance',
    reminderMinutes: 60,
    notes: 'Bring W-2, 1099 forms, and last year\'s return.',
  },
  {
    id: 'a2',
    title: 'Dentist Cleaning',
    dateTime: setTime(addWeeks(today, 3), 14, 30),
    endTime: setTime(addWeeks(today, 3), 15, 30),
    location: 'Bright Smile Dental \u2014 456 Oak Ave',
    category: 'Health',
    reminderMinutes: 60,
    notes: 'Regular 6-month checkup and cleaning.',
  },
  {
    id: 'a3',
    title: 'Eye Exam',
    dateTime: setTime(addDays(today, 24), 9, 0),
    endTime: setTime(addDays(today, 24), 10, 0),
    location: 'Vision Center \u2014 789 Elm Blvd',
    category: 'Health',
    reminderMinutes: 120,
    notes: 'Annual eye exam. Bring current glasses.',
  },
  {
    id: 'a4',
    title: 'Car Service \u2014 Oil Change',
    dateTime: setTime(addWeeks(today, 6), 8, 0),
    endTime: setTime(addWeeks(today, 6), 9, 30),
    location: 'Quick Lube \u2014 321 Auto Way',
    category: 'Car',
    reminderMinutes: 60,
    notes: 'Oil change + tire rotation. 30k mile service.',
  },
] as Appointment[]).sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

// ─── Component ──────────────────────────────────────────────────────────────

export default function AppointmentsScreen() {
  const router = useRouter();

  const renderAppointment = ({ item, index }: { item: Appointment; index: number }) => {
    const cat = CATEGORY_CONFIG[item.category];
    const isLast = index === APPOINTMENTS.length - 1;

    return (
      <View style={styles.timelineItem}>
        {/* Timeline dot + line */}
        <View style={styles.timelineLeft}>
          <View style={styles.timelineDot} />
          {!isLast && <View style={styles.timelineLine} />}
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>

          <Text style={styles.cardDateTime}>
            {formatDateTime(item.dateTime)}
            {item.endTime ? ` \u2013 ${formatTimeOnly(item.endTime)}` : ''}
          </Text>

          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
          </View>

          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: cat.bg }]}>
              <Text style={[styles.badgeText, { color: cat.text }]}>
                {cat.emoji} {item.category}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#F3F4F6' }]}>
              <Text style={[styles.badgeText, { color: '#6B7280' }]}>
                🔔 {getReminderLabel(item.reminderMinutes)}
              </Text>
            </View>
          </View>

          {item.notes && (
            <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
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
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointments</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleRow}>
        <Text style={styles.subtitleEmoji}>📅</Text>
        <Text style={styles.subtitle}>{APPOINTMENTS.length} upcoming appointments</Text>
      </View>

      {/* Timeline List */}
      <FlatList
        data={APPOINTMENTS}
        keyExtractor={(item) => item.id}
        renderItem={renderAppointment}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  backIcon: {
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
    paddingBottom: 8,
  },
  subtitleEmoji: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    alignItems: 'center',
    width: 28,
    marginRight: 12,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#6366F1',
    marginTop: 20,
    borderWidth: 3,
    borderColor: '#C7D2FE',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  card: {
    flex: 1,
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardDateTime: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6366F1',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  locationIcon: {
    fontSize: 12,
  },
  locationText: {
    fontSize: 13,
    color: '#9CA3AF',
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  notes: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
    paddingTop: 8,
  },
});
