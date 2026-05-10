/**
 * Documents — Phase 3b restyle.
 *
 * Reachable from the Vault hub, no longer a top-level tab. Categories
 * differentiated by Lucide-style glyph + neutral chip background per
 * Brief §4.1 ("category differentiation = icon, not colour").
 */
import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { tokens, radius, spacing } from '../../src/lib/tokens';
import {
  AiBottomSheet,
  AskAiButton,
  useAiSheet,
} from '../../src/components/ai';
import {
  BeeMagnifying,
  BeeStanding,
} from '../../src/components/illustrations/bee';

const CATEGORIES = [
  'All',
  'Tax',
  'Insurance',
  'Medical',
  'Housing',
  'Identity',
  'Finance',
] as const;
type Category = (typeof CATEGORIES)[number];

interface Document {
  id: string;
  title: string;
  category: Exclude<Category, 'All'>;
  date: string;
  size: string;
  glyph: string;
}

const DOCUMENTS: Document[] = [
  { id: '1', title: 'W-2 Form 2025', category: 'Tax', date: 'Feb 15, 2026', size: '245 KB', glyph: 'T' },
  { id: '2', title: 'Car Insurance Policy', category: 'Insurance', date: 'Jan 10, 2026', size: '1.2 MB', glyph: 'I' },
  { id: '3', title: 'Annual Health Checkup', category: 'Medical', date: 'Dec 8, 2025', size: '890 KB', glyph: 'M' },
  { id: '4', title: 'Lease Agreement', category: 'Housing', date: 'Nov 1, 2025', size: '2.1 MB', glyph: 'H' },
  { id: '5', title: 'Passport Scan', category: 'Identity', date: 'Oct 15, 2025', size: '3.4 MB', glyph: 'ID' },
  { id: '6', title: '1099-INT Tax Form', category: 'Tax', date: 'Feb 1, 2026', size: '156 KB', glyph: 'T' },
  { id: '7', title: 'Home Insurance Renewal', category: 'Insurance', date: 'Mar 5, 2026', size: '980 KB', glyph: 'I' },
];

export default function DocumentsScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searched, setSearched] = useState(false);
  const sheet = useAiSheet('Help me find a document.');

  const filteredDocs =
    activeCategory === 'All'
      ? DOCUMENTS
      : DOCUMENTS.filter((d) => d.category === activeCategory);

  const renderDocument = ({ item }: { item: Document }) => (
    <PressableDocCard
      onLongPress={() => sheet.open(`Summarise the document "${item.title}".`)}
    >
      <View style={styles.docIconWrapper}>
        <Text style={styles.docIconGlyph}>{item.glyph}</Text>
      </View>
      <View style={styles.docContent}>
        <Text style={styles.docTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.docMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <Text style={styles.docDate}>{item.date}</Text>
        </View>
      </View>
      <View style={styles.docRight}>
        <Text style={styles.docSize}>{item.size}</Text>
        <AskAiButton
          variant="icon"
          onPress={() => sheet.open(`Summarise the document "${item.title}".`)}
        />
      </View>
    </PressableDocCard>
  );

  const noResults = searched && filteredDocs.length === 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.eyebrow}>YOUR VAULT</Text>
          <Text style={styles.headerTitle}>Documents</Text>
        </View>
        <TouchableOpacity style={styles.uploadButton} activeOpacity={0.8}>
          <Text style={styles.uploadButtonText}>Upload</Text>
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
            onPress={() => {
              setActiveCategory(cat);
              setSearched(true);
            }}
            activeOpacity={0.8}
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
          noResults ? (
            <View style={styles.emptyState}>
              <BeeMagnifying size={120} />
              <Text style={styles.emptyTitle}>Couldn&apos;t find anything</Text>
              <Text style={styles.emptyDesc}>
                Try a different category — or ask Laylo to help.
              </Text>
              <View style={{ marginTop: spacing.lg }}>
                <AskAiButton
                  variant="chip"
                  label="Ask Laylo to add something"
                  onPress={() => sheet.open('Help me add a new document.')}
                />
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <BeeStanding size={120} />
              <Text style={styles.emptyTitle}>
                Your vault is empty. Drop a document in.
              </Text>
              <View style={{ marginTop: spacing.lg }}>
                <AskAiButton
                  variant="chip"
                  label="Ask Laylo to add something"
                  onPress={() => sheet.open('Help me add a new document.')}
                />
              </View>
            </View>
          )
        }
      />

      <AiBottomSheet
        visible={sheet.visible}
        onClose={sheet.close}
        initialPrompt={sheet.prompt}
      />
    </View>
  );
}

function PressableDocCard({
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
      <Animated.View style={[styles.docCard, animatedStyle]}>{children}</Animated.View>
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
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: spacing.lg,
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
  uploadButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: tokens.text,
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.bg,
  },
  categoriesRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: tokens.border,
  },
  categoryChipActive: {
    backgroundColor: tokens.text,
    borderColor: tokens.text,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: tokens.textMuted,
  },
  categoryChipTextActive: {
    color: tokens.bg,
  },
  countText: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    fontSize: 13,
    color: tokens.textSubtle,
    fontWeight: '500',
  },
  docList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    gap: spacing.md,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: tokens.border,
    gap: spacing.md,
  },
  docIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: tokens.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIconGlyph: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.text,
  },
  docContent: { flex: 1 },
  docTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: tokens.text,
    marginBottom: spacing.xs + 2,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: tokens.surface2,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: tokens.text,
  },
  docDate: {
    fontSize: 12,
    color: tokens.textSubtle,
  },
  docRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  docSize: {
    fontSize: 12,
    color: tokens.textSubtle,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    fontSize: 16,
    fontWeight: '600',
    color: tokens.text,
    textAlign: 'center',
  },
  emptyDesc: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: tokens.textMuted,
    textAlign: 'center',
  },
});
