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

const FILTERS = ['All', 'Today', 'Upcoming', 'Overdue', 'Completed'];

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  done: boolean;
}

const TASKS: Task[] = [
  {
    id: '1',
    title: 'Renew car insurance',
    description: 'Policy expires on March 30. Compare rates online first.',
    priority: 'high',
    dueDate: 'Mar 25',
    done: false,
  },
  {
    id: '2',
    title: 'Schedule dentist appointment',
    description: 'Annual checkup and cleaning. Call Dr. Smith\'s office.',
    priority: 'medium',
    dueDate: 'Mar 20',
    done: false,
  },
  {
    id: '3',
    title: 'Pay electricity bill',
    description: 'Amount due: $142.50. Set up autopay after this.',
    priority: 'high',
    dueDate: 'Mar 18',
    done: true,
  },
  {
    id: '4',
    title: 'File tax returns',
    description: 'Gather W-2 and 1099 forms. Use TurboTax this year.',
    priority: 'high',
    dueDate: 'Apr 15',
    done: false,
  },
  {
    id: '5',
    title: 'Update passport',
    description: 'Current passport expires in June. Apply for renewal.',
    priority: 'medium',
    dueDate: 'Apr 1',
    done: false,
  },
  {
    id: '6',
    title: 'Cancel unused gym membership',
    description: 'Planet Fitness membership. $30/month savings.',
    priority: 'low',
    dueDate: 'Mar 31',
    done: false,
  },
];

function PriorityBadge({ priority }: { priority: string }) {
  const bgColor = priority === 'high' ? '#FEE2E2' : priority === 'medium' ? '#FEF3C7' : '#DCFCE7';
  const textColor = priority === 'high' ? '#DC2626' : priority === 'medium' ? '#D97706' : '#16A34A';

  return (
    <View style={[styles.priorityBadge, { backgroundColor: bgColor }]}>
      <Text style={[styles.priorityText, { color: textColor }]}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Text>
    </View>
  );
}

export default function TasksScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [tasks, setTasks] = useState(TASKS);

  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === 'Completed') return task.done;
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Today') return !task.done;
    if (activeFilter === 'Upcoming') return !task.done;
    if (activeFilter === 'Overdue') return !task.done && task.priority === 'high';
    return true;
  });

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const renderTask = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={styles.taskCard}
      activeOpacity={0.7}
      onPress={() => console.log('Task tapped:', item.title)}
    >
      <TouchableOpacity
        style={[styles.checkbox, item.done && styles.checkboxDone]}
        onPress={() => toggleTask(item.id)}
        activeOpacity={0.7}
      >
        {item.done && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      <View style={styles.taskContent}>
        <View style={styles.taskTopRow}>
          <Text
            style={[styles.taskTitle, item.done && styles.taskTitleDone]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <PriorityBadge priority={item.priority} />
        </View>
        <Text style={styles.taskDesc} numberOfLines={1}>
          {item.description}
        </Text>
        <Text style={styles.taskDue}>📅 {item.dueDate}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks</Text>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.7}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              activeFilter === filter && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(filter)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filter && styles.filterTextActive,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.taskList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>No tasks here!</Text>
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '400',
    marginTop: -2,
  },
  filtersRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: '#FFF',
  },
  taskList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  taskCard: {
    flexDirection: 'row',
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  checkboxDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  taskContent: {
    flex: 1,
  },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  taskDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  taskDue: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
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
