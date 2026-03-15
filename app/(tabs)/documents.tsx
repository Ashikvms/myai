import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import DocumentCard from '../../components/DocumentCard';
import useDocumentStore from '../../store/useDocumentStore';
import { DocumentCategory } from '../../types';

const categories: { key: DocumentCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'bills', label: 'Bills', icon: 'receipt-outline' },
  { key: 'medical', label: 'Medical', icon: 'medkit-outline' },
  { key: 'insurance', label: 'Insurance', icon: 'shield-checkmark-outline' },
  { key: 'tax', label: 'Tax', icon: 'calculator-outline' },
  { key: 'legal', label: 'Legal', icon: 'document-text-outline' },
];

export default function DocumentsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { selectedCategory, setCategory, getFilteredDocuments } =
    useDocumentStore();
  const filteredDocs = getFilteredDocuments();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Documents</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            onPress={() => setCategory(cat.key)}
            style={[
              styles.categoryChip,
              {
                backgroundColor:
                  selectedCategory === cat.key
                    ? colors.primary
                    : colors.surfaceSecondary,
              },
            ]}
          >
            <Ionicons
              name={cat.icon}
              size={14}
              color={
                selectedCategory === cat.key ? '#FFFFFF' : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.categoryLabel,
                {
                  color:
                    selectedCategory === cat.key
                      ? '#FFFFFF'
                      : colors.textSecondary,
                },
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Document count */}
      <Text style={[styles.countText, { color: colors.textTertiary }]}>
        {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
      </Text>

      {/* Document List */}
      <FlatList
        data={filteredDocs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DocumentCard document={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="folder-open-outline"
              size={56}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              No documents found
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.textTertiary }]}
            >
              Documents in this category will appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRow: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  countText: {
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
