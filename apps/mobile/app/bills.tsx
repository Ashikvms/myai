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

type ActiveTab = 'bills' | 'subscriptions';
type BillCategory = 'Housing' | 'Utilities' | 'Insurance' | 'Transportation' | 'Other';
type SubCategory = 'Entertainment' | 'Health' | 'Tech' | 'Work' | 'Education' | 'Other';

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

// ─── Category Config ────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string; emoji: string }> = {
  Housing:        { bg: '#DBEAFE', text: '#1D4ED8', emoji: '🏠' },
  Utilities:      { bg: '#CFFAFE', text: '#0E7490', emoji: '⚡' },
  Insurance:      { bg: '#F3E8FF', text: '#7C3AED', emoji: '🛡️' },
  Transportation: { bg: '#FEF3C7', text: '#D97706', emoji: '🚗' },
  Entertainment:  { bg: '#FCE7F3', text: '#DB2777', emoji: '🎬' },
  Health:         { bg: '#DCFCE7', text: '#16A34A', emoji: '💪' },
  Tech:           { bg: '#E0E7FF', text: '#4F46E5', emoji: '💻' },
  Work:           { bg: '#FFEDD5', text: '#EA580C', emoji: '💼' },
  Education:      { bg: '#CCFBF1', text: '#0D9488', emoji: '📚' },
  Other:          { bg: '#F3F4F6', text: '#6B7280', emoji: '📋' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function daysBetween(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Demo Data ──────────────────────────────────────────────────────────────

const today = new Date();

const BILLS: Bill[] = [
  { id: 'b1', name: 'Rent', category: 'Housing', amount: 2200, dueDate: toDateStr(addDays(today, 5)), autopay: true },
  { id: 'b2', name: 'Internet', category: 'Utilities', amount: 79.99, dueDate: toDateStr(addDays(today, 12)), autopay: true },
  { id: 'b3', name: 'Car Insurance', category: 'Insurance', amount: 185, dueDate: toDateStr(addDays(today, 8)), autopay: false },
  { id: 'b4', name: 'Electricity', category: 'Utilities', amount: 142.50, dueDate: toDateStr(addDays(today, 1)), autopay: false },
  { id: 'b5', name: 'Phone Plan', category: 'Utilities', amount: 55, dueDate: toDateStr(addDays(today, 18)), autopay: true },
];

const SUBSCRIPTIONS: Subscription[] = [
  { id: 's1', name: 'Netflix', category: 'Entertainment', amount: 15.99, renewalDate: toDateStr(addDays(today, 14)), autopay: true },
  { id: 's2', name: 'Spotify', category: 'Entertainment', amount: 10.99, renewalDate: toDateStr(addDays(today, 7)), autopay: true },
  { id: 's3', name: 'Gym Membership', category: 'Health', amount: 49.99, renewalDate: toDateStr(addDays(today, 3)), autopay: true },
  { id: 's4', name: 'iCloud Storage', category: 'Tech', amount: 2.99, renewalDate: toDateStr(addDays(today, 20)), autopay: true },
  { id: 's5', name: 'ChatGPT Plus', category: 'Tech', amount: 20, renewalDate: toDateStr(addDays(today, 11)), autopay: true },
  { id: 's6', name: 'Adobe Creative Cloud', category: 'Work', amount: 54.99, renewalDate: toDateStr(addDays(today, 22)), autopay: true },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function BillsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('bills');

  const billsTotal = useMemo(() => BILLS.reduce((sum, b) => sum + b.amount, 0), []);
  const subsTotal = useMemo(() => SUBSCRIPTIONS.reduce((sum, s) => sum + s.amount, 0), []);

  const renderBillCard = ({ item }: { item: Bill }) => {
    const cat = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;
    const daysUntilDue = daysBetween(item.dueDate);
    const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3;

    return (
      <View style={[styles.card, isDueSoon && styles.cardDueSoon]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardEmoji}>{cat.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.name}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: cat.bg }]}>
                  <Text style={[styles.badgeText, { color: cat.text }]}>{item.category}</Text>
                </View>
                {item.autopay && (
                  <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.badgeText, { color: '#16A34A' }]}>Autopay</Text>
                  </View>
                )}
                {isDueSoon && (
                  <View style={[styles.badge, { backgroundColor: '#FEF2F2' }]}>
                    <Text style={[styles.badgeText, { color: '#EF4444' }]}>Due soon</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <Text style={styles.cardAmount}>${item.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>Due: {formatDate(item.dueDate)}</Text>
          {isDueSoon && (
            <Text style={styles.dueSoonText}>
              {daysUntilDue === 0 ? 'Due today' : daysUntilDue === 1 ? 'Due tomorrow' : `${daysUntilDue} days left`}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderSubCard = ({ item }: { item: Subscription }) => {
    const cat = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;
    const daysUntilRenewal = daysBetween(item.renewalDate);
    const isDueSoon = daysUntilRenewal >= 0 && daysUntilRenewal <= 3;

    return (
      <View style={[styles.card, isDueSoon && styles.cardDueSoon]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardEmoji}>{cat.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.name}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: cat.bg }]}>
                  <Text style={[styles.badgeText, { color: cat.text }]}>{item.category}</Text>
                </View>
                {item.autopay && (
                  <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.badgeText, { color: '#16A34A' }]}>Autopay</Text>
                  </View>
                )}
                {isDueSoon && (
                  <View style={[styles.badge, { backgroundColor: '#FEF2F2' }]}>
                    <Text style={[styles.badgeText, { color: '#EF4444' }]}>Due soon</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <Text style={styles.cardAmount}>${item.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>Renews: {formatDate(item.renewalDate)}</Text>
          {isDueSoon && (
            <Text style={styles.dueSoonText}>
              {daysUntilRenewal === 0 ? 'Today' : daysUntilRenewal === 1 ? 'Tomorrow' : `${daysUntilRenewal} days left`}
            </Text>
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
        <Text style={styles.headerTitle}>Bills & Subs</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bills' && styles.tabActive]}
          onPress={() => setActiveTab('bills')}
        >
          <Text style={[styles.tabText, activeTab === 'bills' && styles.tabTextActive]}>
            Bills
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'subscriptions' && styles.tabActive]}
          onPress={() => setActiveTab('subscriptions')}
        >
          <Text style={[styles.tabText, activeTab === 'subscriptions' && styles.tabTextActive]}>
            Subscriptions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Monthly Bills</Text>
          <Text style={styles.summaryAmount}>${billsTotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Monthly Subs</Text>
          <Text style={styles.summaryAmount}>${subsTotal.toFixed(2)}</Text>
        </View>
      </View>

      {/* List */}
      {activeTab === 'bills' ? (
        <FlatList
          data={BILLS}
          keyExtractor={(item) => item.id}
          renderItem={renderBillCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={SUBSCRIPTIONS}
          keyExtractor={(item) => item.id}
          renderItem={renderSubCard}
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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
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
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
  cardDueSoon: {
    borderColor: '#FCA5A5',
    borderWidth: 1.5,
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
    gap: 12,
  },
  cardEmoji: {
    fontSize: 28,
    marginTop: 2,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  cardAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6366F1',
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
  },
  cardDate: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  dueSoonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
});
