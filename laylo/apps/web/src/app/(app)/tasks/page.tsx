'use client';

/**
 * Tasks page — REDESIGN_BRIEF.md §2.3.
 * - Prototype state toolbar removed.
 * - Category/priority gradient maps removed.
 * - Per-task AskAi chip ("Break into steps").
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
} from 'lucide-react';
import { format, isToday, isBefore, isAfter, startOfDay, addDays } from 'date-fns';
import { AskAiChip } from '@/components/ai/ask-ai';
import { BeeSleeping } from '@/components/illustrations/bee';

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

const today = startOfDay(new Date());

const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Pay electricity bill', description: 'Monthly electricity bill payment due. $142.50', priority: 'High', category: 'Bills', dueDate: addDays(today, 1), completed: false },
  { id: '2', title: 'Schedule dentist appointment', description: 'Regular checkup and cleaning', priority: 'Medium', category: 'Health', dueDate: addDays(today, 2), completed: false },
  { id: '3', title: 'Review car insurance policy', description: 'Annual review. Compare rates.', priority: 'High', category: 'Finance', dueDate: addDays(today, 5), completed: false },
  { id: '4', title: 'Buy groceries', description: 'Weekly grocery run', priority: 'Low', category: 'Personal', dueDate: today, completed: false },
  { id: '5', title: 'Submit tax documents', description: 'Gather W-2, 1099s for accountant', priority: 'High', category: 'Tax', dueDate: addDays(today, 7), completed: false },
  { id: '6', title: 'Update resume', description: 'Add recent experience', priority: 'Medium', category: 'Work', dueDate: addDays(today, -2), completed: true },
];

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

function filterTasks(tasks: Task[], filter: FilterTab): Task[] {
  switch (filter) {
    case 'All':
      return tasks;
    case 'Today':
      return tasks.filter((t) => isToday(t.dueDate) && !t.completed);
    case 'Upcoming':
      return tasks.filter((t) => isAfter(t.dueDate, today) && !t.completed);
    case 'Overdue':
      return tasks.filter((t) => isBefore(t.dueDate, today) && !isToday(t.dueDate) && !t.completed);
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

const inputClass =
  'w-full px-3 py-2.5 rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[15px] leading-[22px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25';

export default function TasksPage() {
  const reduce = useReducedMotion();
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [modalOpen, setModalOpen] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('Medium');
  const [newCategory, setNewCategory] = useState<Category>('Personal');
  const [newDueDate, setNewDueDate] = useState(format(addDays(today, 1), 'yyyy-MM-dd'));

  const counts: Record<FilterTab, number> = useMemo(() => {
    const filters: FilterTab[] = ['All', 'Today', 'Upcoming', 'Overdue', 'Completed'];
    const result = {} as Record<FilterTab, number>;
    filters.forEach((f) => {
      result[f] = filterTasks(tasks, f).length;
    });
    return result;
  }, [tasks]);

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const filteredTasks = sortTasks(filterTasks(tasks, activeFilter));

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
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

  return (
    <div className="max-w-[960px] mx-auto">
      {/* Header */}
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
            </div>
            <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Tasks</h1>
          </div>
          <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] ml-[52px]">
            {pendingCount} pending · {completedCount} completed
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} />
          Add Task
        </button>
      </header>

      {/* Filter Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {(['All', 'Today', 'Upcoming', 'Overdue', 'Completed'] as FilterTab[]).map((tab) => {
            const Icon = FILTER_ICONS[tab];
            const isActive = activeFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] leading-[18px] font-medium transition-colors ${
                  isActive
                    ? 'text-[var(--color-text-on-accent)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="task-active-tab"
                    className="absolute inset-0 bg-[var(--color-accent)] rounded-[8px]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                  {tab}
                  <span
                    className={`text-[11px] leading-[14px] font-semibold px-1.5 py-0.5 rounded-[8px] ${
                      isActive ? 'bg-[var(--color-text-on-accent)]/15' : 'bg-[var(--color-surface-2)]'
                    }`}
                  >
                    {counts[tab]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty */}
      {filteredTasks.length === 0 && (
        <div className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-12 flex flex-col items-center text-center">
          <BeeSleeping size={96} />
          <h3 className="mt-4 text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
            {activeFilter === 'All' ? 'Inbox zero unlocked' : `No ${activeFilter.toLowerCase()} tasks`}
          </h3>
          <p className="mt-2 max-w-md text-[15px] leading-[22px] text-[var(--color-text-muted)]">
            {activeFilter === 'All'
              ? 'Nothing on the to-do list. Free as a bee.'
              : `You don't have any ${activeFilter.toLowerCase()} tasks right now.`}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              Add Task
            </button>
            <AskAiChip prompt="Help me plan my day" label="Ask Laylo to plan" />
          </div>
        </div>
      )}

      {/* Tasks list */}
      {filteredTasks.length > 0 && (
        <motion.div layout className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task, index) => (
              <motion.div
                key={task.id}
                layout
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40, transition: { duration: 0.15 } }}
                transition={{ duration: 0.2, delay: index * 0.04, ease: [0.4, 0, 0.2, 1] }}
                whileHover={reduce ? undefined : { y: -2 }}
                className={`group rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 hover:shadow-pop transition-all ${
                  task.completed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleTask(task.id)}
                    aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                    className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-[8px] border-2 flex items-center justify-center transition-colors ${
                      task.completed
                        ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                        : 'border-[var(--color-border-strong)] hover:border-[var(--color-accent)]'
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
                          <Check className="w-4 h-4 text-[var(--color-text-on-accent)]" strokeWidth={3} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3
                      className={`text-[16px] leading-[22px] font-semibold text-[var(--color-text)] ${
                        task.completed ? 'line-through' : ''
                      }`}
                    >
                      {task.title}
                    </h3>
                    {task.description && (
                      <p
                        className={`text-[13px] leading-[18px] text-[var(--color-text-muted)] mt-1 truncate ${
                          task.completed ? 'line-through' : ''
                        }`}
                      >
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                        {task.priority}
                      </span>
                      <span className="text-[13px] leading-[18px] font-medium px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                        {task.category}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[13px] leading-[18px] font-medium text-[var(--color-text-subtle)]">
                        <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
                        {getDueDateLabel(task.dueDate)}
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <AskAiChip prompt="Break into steps" context={task.title} iconOnly label="Ask" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add Task Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.15 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 z-50 bg-[var(--color-overlay)] backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pointer-events-none">
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: reduce ? 0 : 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="relative mt-[8vh] w-full max-w-[640px] max-h-[85vh] overflow-y-auto bg-[var(--color-surface)] rounded-[16px] border border-[var(--color-border-strong)] shadow-lg pointer-events-auto"
                role="dialog"
                aria-modal="true"
              >
                <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
                  <h2 className="text-[22px] leading-[28px] font-semibold text-[var(--color-text)]">Add Task</h2>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="p-1 rounded-[8px] text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">
                      Title <span className="text-[var(--color-danger)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="What needs to be done?"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Description</label>
                    <textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Add details…"
                      rows={3}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Priority</label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as Priority)}
                        className={inputClass}
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Category</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as Category)}
                        className={inputClass}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Due Date</label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)]">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-4 h-10 rounded-[16px] text-[15px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addTask}
                    disabled={!newTitle.trim()}
                    className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" strokeWidth={1.75} />
                    Add Task
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
