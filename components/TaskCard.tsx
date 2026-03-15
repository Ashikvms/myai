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
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
}

const categoryColors: Record<string, string> = {
  bills: '#6366F1',
  health: '#EC4899',
  finance: '#10B981',
  home: '#F59E0B',
  personal: '#8B5CF6',
  work: '#3B82F6',
};

const categoryLabels: Record<string, string> = {
  bills: 'Bills',
  health: 'Health',
  finance: 'Finance',
  home: 'Home',
  personal: 'Personal',
  work: 'Work',
};

export default function TaskCard({ task, onToggle, onDelete }: TaskCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const priorityColor =
    task.priority === 'high'
      ? colors.priorityHigh
      : task.priority === 'medium'
        ? colors.priorityMedium
        : colors.priorityLow;

  const catColor = categoryColors[task.category] || colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onLongPress={() => onDelete?.(task.id)}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          shadowColor: colors.cardShadow,
          borderLeftColor: priorityColor,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => onToggle(task.id)}
        style={styles.checkboxArea}
      >
        <Ionicons
          name={task.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={task.completed ? colors.success : colors.textTertiary}
        />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              textDecorationLine: task.completed ? 'line-through' : 'none',
              opacity: task.completed ? 0.5 : 1,
            },
          ]}
          numberOfLines={1}
        >
          {task.title}
        </Text>

        <View style={styles.meta}>
          <View style={styles.dateRow}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={colors.textTertiary}
            />
            <Text style={[styles.dateText, { color: colors.textTertiary }]}>
              {format(parseISO(task.dueDate), 'MMM d, yyyy')}
            </Text>
          </View>

          <View
            style={[styles.categoryTag, { backgroundColor: catColor + '18' }]}
          >
            <Text style={[styles.categoryText, { color: catColor }]}>
              {categoryLabels[task.category]}
            </Text>
          </View>

          <View
            style={[
              styles.priorityDot,
              { backgroundColor: priorityColor },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  checkboxArea: {
    marginRight: 12,
    padding: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
