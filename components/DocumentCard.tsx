import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import Colors from '../constants/Colors';
import { Document } from '../types';

interface DocumentCardProps {
  document: Document;
  onPress?: (doc: Document) => void;
}

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  bills: 'receipt-outline',
  medical: 'medkit-outline',
  insurance: 'shield-checkmark-outline',
  tax: 'calculator-outline',
  legal: 'document-text-outline',
};

const categoryColors: Record<string, string> = {
  bills: '#6366F1',
  medical: '#EC4899',
  insurance: '#10B981',
  tax: '#F59E0B',
  legal: '#3B82F6',
};

export default function DocumentCard({ document, onPress }: DocumentCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const catColor = categoryColors[document.category] || colors.primary;
  const catIcon = categoryIcons[document.category] || 'document-outline';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress?.(document)}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          shadowColor: colors.cardShadow,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: catColor + '15' }]}>
        <Ionicons name={catIcon} size={28} color={catColor} />
      </View>

      <View style={styles.content}>
        <Text
          style={[styles.title, { color: colors.text }]}
          numberOfLines={2}
        >
          {document.title}
        </Text>

        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            {format(parseISO(document.dateAdded), 'MMM d, yyyy')}
          </Text>
          <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            {document.fileSize}
          </Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.textTertiary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
