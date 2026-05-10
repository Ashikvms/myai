'use client';

/**
 * Tasks — Conversational Stack with Progress Hive (LAYOUT_REDESIGN_BRIEF §2.3).
 *
 * Replaces the filter-pill row with a Progress Hive (one hex per task, gold
 * line beneath that fills as tasks are cleared). Filters move into a select.
 *
 * Each task renders a "voice line" composed from category + priority + dueDate
 * (e.g. "Pay the electricity bill — $142.50, due tomorrow."). The user's typed
 * title is shown verbatim on hover via a `title` tooltip per Designer's risk
 * note. High-priority tasks get a 2px gold left-bar; medium/low are smaller.
 *
 * Checkbox is a hexagon, tying back to the Progress Hive vocabulary.
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  CheckSquare,
  Plus,
  Clock,
  Check,
  X,
} from 'lucide-react';
import { format, isToday, isBefore, isAfter, startOfDay, addDays } from 'date-fns';
import { AskAiChip } from '@/components/ai/ask-ai';
import { BeeSleeping, BeeStanding } from '@/components/illustrations/bee';
import { SparkleBurst } from '@/components/motion/sparkle-burst';
import { MotionButton } from '@/components/motion/motion-button';
import { InboxZeroOverlay } from '@/components/celebrations/inbox-zero-overlay';
import { ProgressHive } from '@/components/layout/progress-hive';

const INBOX_ZERO_FLAG = 'beedo:tasks:hadTasks';

const HEX_CLIP = 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)';

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
  amount?: number;
}

const today = startOfDay(new Date());

const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Pay electricity bill', description: 'Monthly electricity bill payment due. $142.50', priority: 'High', category: 'Bills', dueDate: addDays(today, 1), completed: false, amount: 142.5 },
  { id: '2', title: 'Schedule dentist appointment', description: 'Regular checkup and cleaning', priority: 'Medium', category: 'Health', dueDate: addDays(today, 2), completed: false },
  { id: '3', title: 'Review car insurance policy', description: 'Annual review. Compare rates.', priority: 'High', category: 'Finance', dueDate: addDays(today, 5), completed: false },
  { id: '4', title: 'Buy groceries', description: 'Weekly grocery run', priority: 'Low', category: 'Personal', dueDate: today, completed: false },
  { id: '5', title: 'Submit tax documents', description: 'Gather W-2, 1099s for accountant', priority: 'High', category: 'Tax', dueDate: addDays(today, 7), completed: false },
  { id: '6', title: 'Update resume', description: 'Add recent experience', priority: 'Medium', category: 'Work', dueDate: addDays(today, -2), completed: true },
];

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
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });
}

function getDueDateLabel(date: Date): string {
  if (isToday(date)) return 'today';
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff > 1 && diff <= 7) return `in ${diff} days`;
  if (diff > 7) return `on ${format(date, 'MMM d')}`;
  return `${Math.abs(diff)} days ago`;
}

/**
 * Compose a "voice line" from category + priority + dueDate + amount.
 * Returns the rendered display string. Original `title` is kept in the
 * `title=` hover tooltip on the row (per Design risk-flag).
 */
function composeVoiceLine(t: Task): string {
  const due = getDueDateLabel(t.dueDate);
  switch (t.category) {
    case 'Bills':
      if (t.amount) return `Pay the ${t.title.toLowerCase()} — $${t.amount.toFixed(2)}, due ${due}.`;
      return `Pay the ${t.title.toLowerCase()} — due ${due}.`;
    case 'Health':
      return `Book the ${extractNoun(t.title)} ${due === 'today' ? 'today' : `for ${due}`}.`;
    case 'Personal':
      return `${t.title}${due === 'today' ? ' today' : `, ${due}`}.`;
    case 'Finance':
      return `Sort out ${t.title.toLowerCase()} — ${due}.`;
    case 'Tax':
      return `${t.title} — due ${due}. Don’t let it slide.`;
    case 'Home':
      return `Take care of ${t.title.toLowerCase()} ${due === 'today' ? 'today' : `by ${due}`}.`;
    case 'Work':
      return `${t.title} — ${due}.`;
    default:
      return `${t.title} — ${due}.`;
  }
}

function extractNoun(s: string): string {
  // Trivial heuristic: drop leading verbs like "Schedule", "Review", "Buy" etc.
  return s.replace(/^(schedule|book|review|buy|update|file|submit|make)\s+/i, '').toLowerCase();
}

const inputClass =
  'w-full px-3 py-2.5 rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[15px] leading-[22px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25';

export default function TasksPage() {
  const reduce = useReducedMotion();
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [burstingTaskId, setBurstingTaskId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Bee-whisper hover state — only fires after 800ms hover.
  const [whisperId, setWhisperId] = useState<string | null>(null);
  const whisperTimerRef = useRef<number | null>(null);

  const [inboxZeroOpen, setInboxZeroOpen] = useState(false);
  const lastPendingRef = useRef<number | null>(null);

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

  // Inbox-zero overlay on N>0 → 0 transition.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prev = lastPendingRef.current;
    if (prev !== null && prev > 0 && pendingCount === 0) {
      setInboxZeroOpen(true);
    }
    lastPendingRef.current = pendingCount;
    if (pendingCount > 0) {
      sessionStorage.setItem(INBOX_ZERO_FLAG, '1');
    }
  }, [pendingCount]);

  // Progress Hive pips — derived from the entire task list.
  const hivePips = useMemo(
    () => tasks.map((t) => ({ id: t.id, done: t.completed, label: t.title })),
    [tasks],
  );

  const toggleTask = (id: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      const wasCompleted = prev.find((t) => t.id === id)?.completed;
      if (!wasCompleted) {
        setBurstingTaskId(id);
      }
      return next;
    });
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

  const handleHoverStart = (id: string) => {
    setHoveredId(id);
    if (whisperTimerRef.current) window.clearTimeout(whisperTimerRef.current);
    whisperTimerRef.current = window.setTimeout(() => {
      setWhisperId(id);
    }, 800);
  };
  const handleHoverEnd = () => {
    setHoveredId(null);
    if (whisperTimerRef.current) {
      window.clearTimeout(whisperTimerRef.current);
      whisperTimerRef.current = null;
    }
    setWhisperId(null);
  };

  const scrollToTask = (id: string) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(`task-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="max-w-[760px] mx-auto">
      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
            </div>
            <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Tasks</h1>
          </div>
          <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] ml-[52px]">
            {pendingCount} on the list · {completedCount} cleared
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter dropdown — replaces the row of pill tabs */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as FilterTab)}
            className="px-3 h-10 rounded-[16px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[13px] font-medium text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/25"
            aria-label="Filter tasks"
          >
            {(['All', 'Today', 'Upcoming', 'Overdue', 'Completed'] as FilterTab[]).map((f) => (
              <option key={f} value={f}>
                {f} ({counts[f]})
              </option>
            ))}
          </select>
          <MotionButton
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            Add Task
          </MotionButton>
        </div>
      </header>

      {/* Progress Hive */}
      {tasks.length > 0 && <ProgressHive pips={hivePips} onSelect={scrollToTask} />}

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
            <MotionButton
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              Add Task
            </MotionButton>
            <AskAiChip prompt="Help me plan my day" label="Ask Beedo to plan" />
          </div>
        </div>
      )}

      {/* Conversational Stack — the list itself */}
      {filteredTasks.length > 0 && (
        <ul className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task) => {
              const isHigh = task.priority === 'High';
              const sizeClass = isHigh
                ? 'text-[16px] leading-[22px] font-semibold'
                : 'text-[14px] leading-[20px] font-medium';
              const voiceLine = composeVoiceLine(task);
              return (
                <motion.li
                  id={`task-${task.id}`}
                  key={task.id}
                  layout
                  exit={{ opacity: 0, x: -40, transition: { duration: 0.15 } }}
                  whileHover={reduce ? undefined : { y: -1, rotate: 1.5 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  onMouseEnter={() => handleHoverStart(task.id)}
                  onMouseLeave={handleHoverEnd}
                  title={task.title /* original typed title — risk-flag */}
                  className={`group relative rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] hover:shadow-pop transition-shadow ${
                    task.completed ? 'opacity-50' : ''
                  } ${isHigh ? 'pl-1' : 'pl-0'}`}
                >
                  {/* Gold left-bar for High priority */}
                  {isHigh && (
                    <div
                      aria-hidden="true"
                      className="absolute left-0 top-3 bottom-3 w-[2px] bg-[var(--color-accent)] rounded-r-full"
                    />
                  )}
                  {/* Sparkle + sweep on completion (KEPT) */}
                  {burstingTaskId === task.id && (
                    <SparkleBurst
                      onDone={() =>
                        setBurstingTaskId((cur) => (cur === task.id ? null : cur))
                      }
                    />
                  )}
                  {burstingTaskId === task.id && !reduce && (
                    <motion.div
                      aria-hidden="true"
                      initial={{ x: '-110%', opacity: 0 }}
                      animate={{ x: '110%', opacity: [0, 0.6, 0] }}
                      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                      className="pointer-events-none absolute inset-0 rounded-[16px] overflow-hidden"
                      style={{
                        background:
                          'linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.35) 50%, transparent 100%)',
                      }}
                    />
                  )}

                  <div className="relative flex items-center gap-4 p-4">
                    {/* Hexagon checkbox */}
                    <button
                      onClick={() => toggleTask(task.id)}
                      aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                      className="relative flex-shrink-0 w-6 h-6 group/check"
                    >
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 transition-colors"
                        style={{
                          clipPath: HEX_CLIP,
                          WebkitClipPath: HEX_CLIP,
                          background: task.completed
                            ? 'var(--color-accent)'
                            : 'var(--color-border-strong)',
                        }}
                      />
                      {!task.completed && (
                        <div
                          aria-hidden="true"
                          className="absolute inset-[1.5px] group-hover/check:bg-[var(--color-accent-soft)] transition-colors"
                          style={{
                            clipPath: HEX_CLIP,
                            WebkitClipPath: HEX_CLIP,
                            background: 'var(--color-surface)',
                          }}
                        />
                      )}
                      <div className="relative z-10 w-full h-full flex items-center justify-center">
                        <AnimatePresence>
                          {task.completed && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            >
                              <Check
                                className="w-3.5 h-3.5 text-[var(--color-text-on-accent)]"
                                strokeWidth={3}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`${sizeClass} text-[var(--color-text)] ${
                          task.completed ? 'line-through' : ''
                        }`}
                      >
                        {voiceLine}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-[11px] leading-[14px] font-medium px-1.5 py-0.5 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                          {task.category}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] leading-[14px] text-[var(--color-text-subtle)]">
                          <Clock className="w-3 h-3" strokeWidth={1.75} />
                          {format(task.dueDate, 'MMM d')}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`transition-opacity ${
                        hoveredId === task.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <AskAiChip
                        prompt="Break into steps"
                        context={task.title}
                        iconOnly
                        label="Ask"
                      />
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      {/* Bee whisper — peeks from bottom-right corner on long-hover */}
      <AnimatePresence>
        {whisperId && !reduce && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-[60] pointer-events-none"
          >
            <BeeStanding size={32} />
          </motion.div>
        )}
      </AnimatePresence>

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
                  <MotionButton
                    onClick={addTask}
                    disabled={!newTitle.trim()}
                    className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" strokeWidth={1.75} />
                    Add Task
                  </MotionButton>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Inbox-zero earned celebration */}
      <InboxZeroOverlay open={inboxZeroOpen} onClose={() => setInboxZeroOpen(false)} />
    </div>
  );
}
