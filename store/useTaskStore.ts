import { create } from 'zustand';
import { Task, TaskFilter } from '../types';

interface TaskState {
  tasks: Task[];
  filter: TaskFilter;
  setFilter: (filter: TaskFilter) => void;
  addTask: (task: Task) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  getFilteredTasks: () => Task[];
}

const demoTasks: Task[] = [
  {
    id: '1',
    title: 'Pay electricity bill',
    description: 'Monthly electricity bill payment due',
    dueDate: '2026-03-17',
    priority: 'high',
    category: 'bills',
    completed: false,
    createdAt: '2026-03-10',
  },
  {
    id: '2',
    title: 'Schedule dentist appointment',
    description: 'Annual dental checkup',
    dueDate: '2026-03-20',
    priority: 'medium',
    category: 'health',
    completed: false,
    createdAt: '2026-03-08',
  },
  {
    id: '3',
    title: 'File quarterly taxes',
    description: 'Q1 estimated tax payment',
    dueDate: '2026-03-31',
    priority: 'high',
    category: 'finance',
    completed: false,
    createdAt: '2026-03-01',
  },
  {
    id: '4',
    title: 'Renew car insurance',
    description: 'Annual policy renewal',
    dueDate: '2026-03-25',
    priority: 'high',
    category: 'finance',
    completed: false,
    createdAt: '2026-03-05',
  },
  {
    id: '5',
    title: 'Organize kitchen pantry',
    description: 'Declutter and restock essentials',
    dueDate: '2026-03-15',
    priority: 'low',
    category: 'home',
    completed: false,
    createdAt: '2026-03-12',
  },
  {
    id: '6',
    title: 'Update emergency contacts',
    description: 'Review and update emergency contact list',
    dueDate: '2026-03-18',
    priority: 'medium',
    category: 'personal',
    completed: false,
    createdAt: '2026-03-09',
  },
  {
    id: '7',
    title: 'Submit expense report',
    description: 'February travel expenses',
    dueDate: '2026-03-14',
    priority: 'medium',
    category: 'work',
    completed: true,
    createdAt: '2026-03-07',
  },
  {
    id: '8',
    title: 'Renew passport',
    description: 'Passport expires in 6 months',
    dueDate: '2026-04-15',
    priority: 'medium',
    category: 'personal',
    completed: false,
    createdAt: '2026-03-01',
  },
];

const useTaskStore = create<TaskState>((set, get) => ({
  tasks: demoTasks,
  filter: 'today',
  setFilter: (filter) => set({ filter }),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  toggleTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    })),
  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    })),
  getFilteredTasks: () => {
    const { tasks, filter } = get();
    const today = new Date().toISOString().split('T')[0];
    switch (filter) {
      case 'today':
        return tasks.filter((t) => !t.completed && t.dueDate <= today);
      case 'upcoming':
        return tasks.filter((t) => !t.completed && t.dueDate > today);
      case 'completed':
        return tasks.filter((t) => t.completed);
      default:
        return tasks;
    }
  },
}));

export default useTaskStore;
