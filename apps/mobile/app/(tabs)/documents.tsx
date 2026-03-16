import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';

const COLORS = {
  primary: '#6366F1',
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#111',
  textSecondary: '#666',
};

const CATEGORIES = ['All', 'Tax', 'Insurance', 'Medical', 'Housing', 'Identity', 'Finance'];

interface Document {
  id: string;
  title: string;
  category: string;
  date: string;
  size: string;
  emoji: string;
}

const DOCUMENTS: Document[] = [
  {
    id: '1',
    title: 'W-2 Form 2025',
    category: 'Tax',
    date: 'Feb 15, 2026',
    size: '245 KB',
    emoji: '📊',
  },
  {
    id: '2',
    title: 'Car Insurance Policy',
    category: 'Insurance',
    date: 'Jan 10, 2026',
    size: '1.2 MB',
    emoji: '🚗',
  },
  {
    id: '3',
    title: 'Annual Health Checkup',
    category: 'Medical',
    date: 'Dec 8, 2025',
    size: '890 KB',
    emoji: '🏥',
  },
  {
    id: '4',
    title: 'Lease Agreement',
    category: 'Housing',
    date: 'Nov 1, 2025',
    size: '2.1 MB',
    emoji: '🏠',
  },
  {
    id: '5',
    title: 'Passport Scan',
    category: 'Identity',
    date: 'Oct 15, 2025',
    size: '3.4 MB',
    emoji: '🛂',
  },
  {
    id: '6',
    title: '1099-INT Tax Form',
    category: 'Tax',
    date: 'Feb 1, 2026',
    size: '156 KB',
    emoji: '📊',
  },
  {
    id: '7',
    title: 'Home Insurance Renewal',
    category: 'Insurance',
    date: 'Mar 5, 2026',
    size: '980 KB',
    emoji: '🏡',
  },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Tax: { bg: '#EEF2FF', text: '#6366F1' },
  Insurance: { bg: '#FEF3C7', text: '#D97706' },
  Medical: { bg: '#DCFCE7', text: '#16A34A' },
  Housing: { bg: '#FEE2E2', text: '#DC2626' },
  Identity: { bg: '#E0E7FF', text: '#4F46E5' },
  Finance: { bg: '#F3E8FF', text: '#7C3AED' },
};

export default function DocumentsScreen() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredDocs =
    activeCategory === 'All'
      ? DOCUMENTS
      : DOCUMENTS.filter((d) => d.category === activeCategory);

  const renderDocument = ({ item }: { item: Document }) => {
    const catColor = CATEGORY_COLORS[item.category] || { bg: '#F3F4F6', text: '#666' };

    return (
      <TouchableOpacity style={styles.docCard} activeOpacity={0.7}>
        <View style={styles.docIconWrapper}>
          <Text style={styles.docEmoji}>{item.emoji}</Text>
        </View>
        <View style={styles.docContent}>
          <Text style={styles.docTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.docMeta}>
            <View style={[styles.categoryBadge, { backgroundColor: catColor.bg }]}>
              <Text style={[styles.categoryText, { color: catColor.text }]}>
                {item.category}
              </Text>
            </View>
            <Text style={styles.docDate}>{item.date}</Text>
          </View>
        </View>
        <Text style={styles.docSize}>{item.size}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Documents</Text>
        <TouchableOpacity style={styles.uploadButton} activeOpacity={0.7}>
          <Text style={styles.uploadButtonText}>📎 Upload</Text>
        </TouchableOpacity>
      </View>

      {/* Category Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesRow}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryChip,
              activeCategory === cat && styles.categoryChipActive,
            ]}
            onPress={() => setActiveCategory(cat)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.categoryChipText,
                activeCategory === cat && styles.categoryChipTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Document count */}
      <Text style={styles.countText}>
        {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
      </Text>

      {/* Document List */}
      <FlatList
        data={filteredDocs}
        renderItem={renderDocument}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.docList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📂</Text>
            <Text style={styles.emptyText}>No documents in this category</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  uploadButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '12',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  categoriesRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  countText: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  docList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  docIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  docEmoji: {
    fontSize: 22,
  },
  docContent: {
    flex: 1,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  docDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  docSize: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
