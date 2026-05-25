/**
 * Documents — Phase 3b restyle.
 *
 * Reachable from the Vault hub, no longer a top-level tab. Categories
 * differentiated by Lucide-style glyph + neutral chip background per
 * Brief §4.1 ("category differentiation = icon, not colour").
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
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
import { useTokens, type Tokens, radius, spacing } from '../../src/lib/tokens';
import {
  AiBottomSheet,
  AskAiButton,
  useAiSheet,
} from '../../src/components/ai';
import {
  BeeMagnifying,
  BeeStanding,
} from '../../src/components/illustrations/bee';
import { StaggeredListItem } from '../../src/components/motion/staggered-list-item';
import { listDocuments, type ApiDocument } from '../../src/lib/api/resources';

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

function toCategory(c: string | null | undefined): Exclude<Category, 'All'> {
  if (!c) return 'Finance';
  const allowed: Exclude<Category, 'All'>[] = [
    'Tax',
    'Insurance',
    'Medical',
    'Housing',
    'Identity',
    'Finance',
  ];
  return allowed.includes(c as Exclude<Category, 'All'>)
    ? (c as Exclude<Category, 'All'>)
    : 'Finance';
}

function glyphFor(cat: Exclude<Category, 'All'>): string {
  switch (cat) {
    case 'Tax':
      return 'T';
    case 'Insurance':
      return 'I';
    case 'Medical':
      return 'M';
    case 'Housing':
      return 'H';
    case 'Identity':
      return 'ID';
    default:
      return 'F';
  }
}

function formatSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function adapt(d: ApiDocument): Document {
  const cat = toCategory(d.category);
  return {
    id: d.id,
    title: d.title,
    category: cat,
    date: formatDate(d.createdAt),
    size: formatSize(d.sizeBytes),
    glyph: glyphFor(cat),
  };
}

export default function DocumentsScreen() {
  const t = useTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searched, setSearched] = useState(false);
  const sheet = useAiSheet('Help me find a document.');

  const docsQuery = useQuery({
    queryKey: ['documents'],
    queryFn: listDocuments,
  });

  const documents = useMemo(
    () => (docsQuery.data ?? []).map(adapt),
    [docsQuery.data],
  );

  const filteredDocs =
    activeCategory === 'All'
      ? documents
      : documents.filter((d) => d.category === activeCategory);

  const renderDocument = ({
    item,
    index,
  }: {
    item: Document;
    index: number;
  }) => (
    <StaggeredListItem index={index}>
    <PressableDocCard
      onLongPress={() => sheet.open(`Summarise the document "${item.title}".`)}
      styles={styles}
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
    </StaggeredListItem>
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
      {docsQuery.isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={t.accent} />
          <Text style={[styles.emptyTitle, { marginTop: spacing.md }]}>
            Loading the hive…
          </Text>
        </View>
      ) : (
      <FlatList
        data={filteredDocs}
        renderItem={renderDocument}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.docList}
        showsVerticalScrollIndicator={false}
        refreshing={docsQuery.isFetching}
        onRefresh={() => docsQuery.refetch()}
        ListEmptyComponent={
          noResults ? (
            <View style={styles.emptyState}>
              <BeeMagnifying size={120} />
              <Text style={styles.emptyTitle}>Couldn&apos;t find anything</Text>
              <Text style={styles.emptyDesc}>
                Try a different category — or ask BillBee to help.
              </Text>
              <View style={{ marginTop: spacing.lg }}>
                <AskAiButton
                  variant="chip"
                  label="Ask BillBee to add something"
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
                  label="Ask BillBee to add something"
                  onPress={() => sheet.open('Help me add a new document.')}
                />
              </View>
            </View>
          )
        }
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

function PressableDocCard({
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
    >
      <Animated.View style={[styles.docCard, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
  container: {
    flex: 1,
    // Transparent — GradientBackground in (tabs)/_layout.tsx paints
    // the canvas underneath so the wash shows through.
    backgroundColor: 'transparent',
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
  uploadButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: t.text,
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: t.bg,
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
    borderColor: t.border,
  },
  categoryChipActive: {
    backgroundColor: t.text,
    borderColor: t.text,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: t.textMuted,
  },
  categoryChipTextActive: {
    color: t.bg,
  },
  countText: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    fontSize: 13,
    color: t.textSubtle,
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
    backgroundColor: t.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: t.border,
    gap: spacing.md,
  },
  docIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: t.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIconGlyph: {
    fontSize: 14,
    fontWeight: '700',
    color: t.text,
  },
  docContent: { flex: 1 },
  docTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: t.text,
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
    backgroundColor: t.surface2,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: t.text,
  },
  docDate: {
    fontSize: 12,
    color: t.textSubtle,
  },
  docRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  docSize: {
    fontSize: 12,
    color: t.textSubtle,
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
    color: t.text,
    textAlign: 'center',
  },
  emptyDesc: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: t.textMuted,
    textAlign: 'center',
  },
});
}

type Styles = ReturnType<typeof makeStyles>;

