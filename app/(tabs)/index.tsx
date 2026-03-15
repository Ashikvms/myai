import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import SuggestionCard from '../../components/SuggestionCard';
import QuickAction from '../../components/QuickAction';
import usePreferenceStore from '../../store/usePreferenceStore';

interface BillItem {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface AppointmentItem {
  id: string;
  title: string;
  date: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const bills: BillItem[] = [
  { id: '1', title: 'Electricity', amount: 142.5, dueDate: 'Mar 17', icon: 'flash-outline', color: '#F59E0B' },
  { id: '2', title: 'Car Insurance', amount: 189.0, dueDate: 'Mar 25', icon: 'car-outline', color: '#6366F1' },
  { id: '3', title: 'Internet', amount: 79.99, dueDate: 'Mar 28', icon: 'wifi-outline', color: '#3B82F6' },
];

const appointments: AppointmentItem[] = [
  { id: '1', title: 'Dentist Checkup', date: 'Mar 20', time: '10:00 AM', icon: 'medkit-outline', color: '#EC4899' },
  { id: '2', title: 'Car Service', date: 'Mar 22', time: '2:00 PM', icon: 'car-outline', color: '#10B981' },
  { id: '3', title: 'Tax Advisor', date: 'Mar 28', time: '11:00 AM', icon: 'calculator-outline', color: '#F59E0B' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const userName = usePreferenceStore((s) => s.userName);
  const firstName = userName.split(' ')[0];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {getGreeting()},
            </Text>
            <Text style={[styles.name, { color: colors.text }]}>
              {firstName}
            </Text>
          </View>
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.primary + '20' },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {firstName[0]}
            </Text>
          </View>
        </View>

        {/* AI Suggestions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          AI Suggestions
        </Text>
        <SuggestionCard
          icon="bulb-outline"
          title="Electricity bill due in 2 days"
          description="Your electricity bill of $142.50 is due on March 17. Set up autopay to never miss a payment."
          color="#F59E0B"
          onPress={() => router.push('/tasks')}
        />
        <SuggestionCard
          icon="shield-checkmark-outline"
          title="Insurance renewal reminder"
          description="Your car insurance policy expires on March 25. Compare rates to save up to 15%."
          color="#10B981"
          onPress={() => router.push('/documents')}
        />
        <SuggestionCard
          icon="document-text-outline"
          title="Tax deadline approaching"
          description="Q1 estimated taxes are due March 31. Would you like help organizing your documents?"
          color="#6366F1"
          onPress={() => router.push('/assistant')}
        />

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Quick Actions
        </Text>
        <View style={styles.quickActions}>
          <QuickAction
            icon="add-circle-outline"
            label="Add Task"
            color="#6366F1"
            onPress={() => router.push('/tasks')}
          />
          <QuickAction
            icon="scan-outline"
            label="Scan Doc"
            color="#EC4899"
            onPress={() => router.push('/documents')}
          />
          <QuickAction
            icon="card-outline"
            label="Pay Bill"
            color="#10B981"
            onPress={() => router.push('/tasks')}
          />
          <QuickAction
            icon="calendar-outline"
            label="Schedule"
            color="#F59E0B"
            onPress={() => router.push('/tasks')}
          />
        </View>

        {/* Bills Due Soon */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Bills Due Soon
        </Text>
        <View
          style={[
            styles.billsCard,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          {bills.map((bill, index) => (
            <View key={bill.id}>
              <View style={styles.billRow}>
                <View
                  style={[
                    styles.billIcon,
                    { backgroundColor: bill.color + '15' },
                  ]}
                >
                  <Ionicons name={bill.icon} size={20} color={bill.color} />
                </View>
                <View style={styles.billInfo}>
                  <Text style={[styles.billTitle, { color: colors.text }]}>
                    {bill.title}
                  </Text>
                  <Text
                    style={[styles.billDate, { color: colors.textTertiary }]}
                  >
                    Due {bill.dueDate}
                  </Text>
                </View>
                <Text style={[styles.billAmount, { color: colors.text }]}>
                  ${bill.amount.toFixed(2)}
                </Text>
              </View>
              {index < bills.length - 1 && (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.border },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Upcoming Appointments */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Upcoming Appointments
        </Text>
        <View
          style={[
            styles.billsCard,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          {appointments.map((apt, index) => (
            <View key={apt.id}>
              <View style={styles.billRow}>
                <View
                  style={[
                    styles.billIcon,
                    { backgroundColor: apt.color + '15' },
                  ]}
                >
                  <Ionicons name={apt.icon} size={20} color={apt.color} />
                </View>
                <View style={styles.billInfo}>
                  <Text style={[styles.billTitle, { color: colors.text }]}>
                    {apt.title}
                  </Text>
                  <Text
                    style={[styles.billDate, { color: colors.textTertiary }]}
                  >
                    {apt.date} at {apt.time}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </View>
              {index < appointments.length - 1 && (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.border },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '500',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  billsCard: {
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  billIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  billInfo: {
    flex: 1,
  },
  billTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  billDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 0.5,
    marginLeft: 64,
  },
  bottomSpacer: {
    height: 20,
  },
});
