'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Plus,
  Clock,
  Check,
  X,
  ListTodo,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Moon,
  Sun,
  Smartphone,
  Loader2,
  PackageOpen,
} from 'lucide-react';
import { format, isToday, isBefore, isAfter, startOfDay, addDays } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority = 'High' | 'Medium' | 'Low';
type Category = 'Bills' | 'Health' | 'Finance' | 'Personal' | 'Tax' | 'Home' | 'Work';
type FilterTab = 'All' | 'Today' | 'Upcoming' | 'Overdue' | 'Completed';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  category: Category;
  dueDate: Date;
  completed: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const today = startOfDay(new Date());

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Pay electricity bill',
    description: 'Monthly electricity bill payment due. $142.50',
    priority: 'High',
    category: 'Bills',
    dueDate: addDays(today, 1),
    completed: false,
  },
  {
    id: '2',
    title: 'Schedule dentist appointment',
    description: 'Regular checkup and cleaning',
    priority: 'Medium',
    category: 'Health',
    dueDate: addDays(today, 2),
    completed: false,
  },
  {
    id: '3',
    title: 'Review car insurance policy',
    description: 'Annual review. Compare rates.',
    priority: 'High',
    category: 'Finance',
    dueDate: addDays(today, 5),
    completed: false,
  },
  {
    id: '4',
    title: 'Buy groceries',
    description: 'Weekly grocery run',
    priority: 'Low',
    category: 'Personal',
    dueDate: today,
    completed: false,
  },
  {
    id: '5',
    title: 'Submit tax documents',
    description: 'Gather W-2, 1099s for accountant',
    priority: 'High',
    category: 'Tax',
    dueDate: addDays(today, 7),
    completed: false,
  },
  {
    id: '6',
    title: 'Update resume',
    description: 'Add recent experience',
    priority: 'Medium',
    category: 'Work',
    dueDate: addDays(today, -2),
    completed: true,
  },
];

const PRIORITY_CONFIG: Record<Priority, { bg: string; text: string; darkBg: string; darkText: string }> = {
  High: { bg: 'bg-red-50', text: 'text-red-600', darkBg: 'bg-red-900/30', darkText: 'text-red-400' },
  Medium: { bg: 'bg-amber-50', text: 'text-amber-600', darkBg: 'bg-amber-900/30', darkText: 'text-amber-400' },
  Low: { bg: 'bg-green-50', text: 'text-green-600', darkBg: 'bg-green-900/30', darkText: 'text-green-400' },
};

const CATEGORY_CONFIG: Record<Category, { bg: string; text: string; darkBg: string; darkText: string }> = {
  Bills: { bg: 'bg-purple-50', text: 'text-purple-600', darkBg: 'bg-purple-900/30', darkText: 'text-purple-400' },
  Health: { bg: 'bg-teal-50', text: 'text-teal-600', darkBg: 'bg-teal-900/30', darkText: 'text-teal-400' },
  Finance: { bg: 'bg-blue-50', text: 'text-blue-600', darkBg: 'bg-blue-900/30', darkText: 'text-blue-400' },
  Personal: { bg: 'bg-pink-50', text: 'text-pink-600', darkBg: 'bg-pink-900/30', darkText: 'text-pink-400' },
  Tax: { bg: 'bg-orange-50', text: 'text-orange-600', darkBg: 'bg-orange-900/30', darkText: 'text-orange-400' },
  Home: { bg: 'bg-emerald-50', text: 'text-emerald-600', darkBg: 'bg-emerald-900/30', darkText: 'text-emerald-400' },
  Work: { bg: 'bg-indigo-50', text: 'text-indigo-600', darkBg: 'bg-indigo-900/30', darkText: 'text-indigo-400' },
};

const FILTER_ICONS: Record<FilterTab, React.ElementType> = {
  All: ListTodo,
  Today: CalendarDays,
  Upcoming: Clock,
  Overdue: AlertTriangle,
  Completed: CheckCircle2,
};

const CATEGORIES: Category[] = ['Bills', 'Health', 'Finance', 'Personal', 'Tax', 'Home', 'Work'];
const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];

const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function filterTasks(tasks: Task[], filter: FilterTab): Task[] {
  switch (filter) {
    case 'All':
      return tasks;
    case 'Today':
      return tasks.filter((t) => isToday(t.dueDate) && !t.completed);
    case 'Upcoming':
      return tasks.filter((t) => isAfter(t.dueDate, today) && !t.completed);
    case 'Overdue':
      return tasks.filter(
        (t) => isBefore(t.dueDate, today) && !isToday(t.dueDate) && !t.completed
      );
    case 'Completed':
      return tasks.filter((t) => t.completed);
  }
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });
}

function getDueDateLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1) return `In ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

function getDueDateColor(date: Date, completed: boolean, dark: boolean): string {
  if (completed) return dark ? 'text-gray-500' : 'text-gray-400';
  if (isBefore(date, today) && !isToday(date)) return dark ? 'text-red-400' : 'text-red-500';
  if (isToday(date)) return dark ? 'text-amber-400' : 'text-amber-600';
  return dark ? 'text-gray-400' : 'text-gray-500';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TasksPage() {
  // State toolbar
  type PreviewMode = 'default' | 'dark' | 'mobile' | 'loading' | 'empty';
  const [previewMode, setPreviewMode] = useState<PreviewMode>('default');

  const dark = previewMode === 'dark';
  const mobile = previewMode === 'mobile';
  const loading = previewMode === 'loading';
  const empty = previewMode === 'empty';

  // Task state
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [modalOpen, setModalOpen] = useState(false);

  // New task form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('Medium');
  const [newCategory, setNewCategory] = useState<Category>('Personal');
  const [newDueDate, setNewDueDate] = useState(format(addDays(today, 1), 'yyyy-MM-dd'));

  const displayTasks = empty ? [] : tasks;

  // Counts
  const counts: Record<FilterTab, number> = useMemo(() => {
    const filters: FilterTab[] = ['All', 'Today', 'Upcoming', 'Overdue', 'Completed'];
    const result = {} as Record<FilterTab, number>;
    filters.forEach((f) => {
      result[f] = filterTasks(displayTasks, f).length;
    });
    return result;
  }, [displayTasks]);

  const pendingCount = displayTasks.filter((t) => !t.completed).length;
  const completedCount = displayTasks.filter((t) => t.completed).length;

  const filteredTasks = sortTasks(filterTasks(displayTasks, activeFilter));

  // Handlers
  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const addTask = () => {
    if (!newTitle.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      description: newDesc.trim(),
      priority: newPriority,
      category: newCategory,
      dueDate: startOfDay(new Date(newDueDate)),
      completed: false,
    };
    setTasks((prev) => [...prev, task]);
    setNewTitle('');
    setNewDesc('');
    setNewPriority('Medium');
    setNewCategory('Personal');
    setNewDueDate(format(addDays(today, 1), 'yyyy-MM-dd'));
    setModalOpen(false);
  };

  // ─── State Toolbar Modes ─────────────────────────────────────────────────

  const modes: { key: PreviewMode; label: string; icon: React.ElementType }[] = [
    { key: 'default', label: 'Default', icon: Sun },
    { key: 'dark', label: 'Dark Mode', icon: Moon },
    { key: 'mobile', label: 'Mobile', icon: Smartphone },
    { key: 'loading', label: 'Loading', icon: Loader2 },
    { key: 'empty', label: 'Empty', icon: PackageOpen },
  ];

  // ─── Styles ──────────────────────────────────────────────────────────────

  const pageBg = dark ? 'bg-[#0F0F0F]' : 'bg-[#FAFAFA]';
  const cardBg = dark ? 'bg-[#1A1A1A]' : 'bg-white';
  const cardBorder = dark ? 'border-white/5' : 'border-gray-100';
  const textPrimary = dark ? 'text-white' : 'text-gray-900';
  const textSecondary = dark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = dark ? 'text-gray-500' : 'text-gray-400';

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen ${pageBg} transition-colors duration-300`}>
      {/* ── State Toolbar ─────────────────────────────────────────────── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 rounded-full bg-gray-900/95 backdrop-blur-sm px-2 py-1.5 shadow-2xl border border-white/10">
          {modes.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setPreviewMode(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                previewMode === key
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${key === 'loading' && previewMode === key ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Container ────────────────────────────────────────────── */}
      <div
        className={`mx-auto px-4 sm:px-6 pt-20 pb-12 transition-all duration-300 ${
          mobile ? 'max-w-[390px]' : 'max-w-4xl'
        }`}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/25">
                  <CheckSquare className="w-6 h-6 text-white" />
                </div>
                <h1 className={`text-3xl font-bold ${textPrimary}`}>Tasks</h1>
              </div>
              <p className={`text-sm ${textSecondary} ml-[52px]`}>
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading tasks...
                  </span>
                ) : (
                  `${pendingCount} pending \u00b7 ${completedCount} completed`
                )}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </motion.button>
          </div>
        </motion.div>

        {/* ── Filter Tabs ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6 overflow-x-auto scrollbar-hide"
        >
          <div className="flex items-center gap-2 min-w-max">
            {(['All', 'Today', 'Upcoming', 'Overdue', 'Completed'] as FilterTab[]).map(
              (tab) => {
                const Icon = FILTER_ICONS[tab];
                const isActive = activeFilter === tab;
                return (
                  <motion.button
                    key={tab}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setActiveFilter(tab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                        : dark
                        ? 'text-gray-400 hover:text-white hover:bg-white/5'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab}
                    <span
                      className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : dark
                          ? 'bg-white/10 text-gray-500'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {counts[tab]}
                    </span>
                  </motion.button>
                );
              }
            )}
          </div>
        </motion.div>

        {/* ── Loading State ───────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`rounded-2xl border ${cardBorder} ${cardBg} p-5 animate-pulse`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-6 h-6 rounded-lg ${dark ? 'bg-white/10' : 'bg-gray-200'}`} />
                  <div className="flex-1 space-y-3">
                    <div className={`h-5 rounded-lg w-2/3 ${dark ? 'bg-white/10' : 'bg-gray-200'}`} />
                    <div className={`h-4 rounded-lg w-1/2 ${dark ? 'bg-white/5' : 'bg-gray-100'}`} />
                    <div className="flex gap-2">
                      <div className={`h-6 w-16 rounded-lg ${dark ? 'bg-white/10' : 'bg-gray-200'}`} />
                      <div className={`h-6 w-16 rounded-lg ${dark ? 'bg-white/10' : 'bg-gray-200'}`} />
                      <div className={`h-6 w-24 rounded-lg ${dark ? 'bg-white/10' : 'bg-gray-200'}`} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty State ─────────────────────────────────────────────── */}
        {!loading && filteredTasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className={`rounded-2xl border ${cardBorder} ${cardBg} p-12 text-center`}
          >
            <div
              className={`inline-flex p-4 rounded-2xl mb-4 ${
                dark ? 'bg-white/5' : 'bg-gray-50'
              }`}
            >
              <Inbox className={`w-10 h-10 ${textMuted}`} />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>
              {activeFilter === 'All' ? 'No tasks yet' : `No ${activeFilter.toLowerCase()} tasks`}
            </h3>
            <p className={`text-sm mb-6 ${textSecondary}`}>
              {activeFilter === 'All'
                ? 'Create your first task to get started with Life Admin AI.'
                : `You don\u2019t have any ${activeFilter.toLowerCase()} tasks right now.`}
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </motion.button>
          </motion.div>
        )}

        {/* ── Task Cards ──────────────────────────────────────────────── */}
        {!loading && filteredTasks.length > 0 && (
          <motion.div layout className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                  className={`group rounded-2xl border ${cardBorder} ${cardBg} p-5 transition-all hover:shadow-lg ${
                    dark ? 'hover:border-white/10' : 'hover:border-gray-200 hover:shadow-gray-200/50'
                  } ${task.completed ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        task.completed
                          ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-500'
                          : dark
                          ? 'border-white/20 hover:border-indigo-400'
                          : 'border-gray-300 hover:border-indigo-500'
                      }`}
                    >
                      <AnimatePresence>
                        {task.completed && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          >
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-base font-semibold mb-1 transition-all ${textPrimary} ${
                          task.completed ? 'line-through opacity-60' : ''
                        }`}
                      >
                        {task.title}
                      </h3>
                      <p
                        className={`text-sm mb-3 truncate ${textSecondary} ${
                          task.completed ? 'line-through opacity-50' : ''
                        }`}
                      >
                        {task.description}
                      </p>

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Priority badge */}
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                            dark
                              ? `${PRIORITY_CONFIG[task.priority].darkBg} ${PRIORITY_CONFIG[task.priority].darkText}`
                              : `${PRIORITY_CONFIG[task.priority].bg} ${PRIORITY_CONFIG[task.priority].text}`
                          }`}
                        >
                          {task.priority}
                        </span>

                        {/* Category badge */}
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                            dark
                              ? `${CATEGORY_CONFIG[task.category].darkBg} ${CATEGORY_CONFIG[task.category].darkText}`
                              : `${CATEGORY_CONFIG[task.category].bg} ${CATEGORY_CONFIG[task.category].text}`
                          }`}
                        >
                          {task.category}
                        </span>

                        {/* Due date */}
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${getDueDateColor(
                            task.dueDate,
                            task.completed,
                            dark
                          )}`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {getDueDateLabel(task.dueDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── Add Task Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`fixed z-50 ${
                mobile
                  ? 'inset-0'
                  : 'inset-x-4 top-[10%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg'
              }`}
            >
              <div
                className={`${
                  mobile ? 'h-full rounded-none' : 'rounded-2xl'
                } ${cardBg} border ${cardBorder} shadow-2xl overflow-hidden flex flex-col`}
              >
                {/* Modal Header */}
                <div
                  className={`flex items-center justify-between px-6 py-4 border-b ${cardBorder}`}
                >
                  <h2 className={`text-lg font-semibold ${textPrimary}`}>Add Task</h2>
                  <button
                    onClick={() => setModalOpen(false)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      dark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  {/* Title */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="What needs to be done?"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none ${
                        dark
                          ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-indigo-500'
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-500'
                      }`}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                      Description
                    </label>
                    <textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Add details..."
                      rows={3}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none resize-none ${
                        dark
                          ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-indigo-500'
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-500'
                      }`}
                    />
                  </div>

                  {/* Priority + Category */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                        Priority
                      </label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as Priority)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none appearance-none cursor-pointer ${
                          dark
                            ? 'bg-white/5 border-white/10 text-white focus:border-indigo-500'
                            : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'
                        }`}
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                        Category
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as Category)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none appearance-none cursor-pointer ${
                          dark
                            ? 'bg-white/5 border-white/10 text-white focus:border-indigo-500'
                            : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'
                        }`}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none ${
                        dark
                          ? 'bg-white/5 border-white/10 text-white focus:border-indigo-500'
                          : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div
                  className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${cardBorder}`}
                >
                  <button
                    onClick={() => setModalOpen(false)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      dark
                        ? 'text-gray-400 hover:text-white hover:bg-white/10'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={addTask}
                    disabled={!newTitle.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Task
                    </span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
