'use client';

/**
 * Reminders page — REDESIGN_BRIEF.md §2.5 + §9.2.
 * - CRITICAL theme bug fixed: useState(()=>{...MutationObserver}) replaced
 *   with `useTheme()` from next-themes.
 * - Per-reminder AskAi chip ("Why was this set?").
 */
import { useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Bell,
  Plus,
  X,
  CheckCircle,
  Trash2,
  Clock,
  RefreshCw,
  FileText,
  CalendarDays,
  CreditCard,
  Repeat,
} from 'lucide-react';
import { format, addDays, addMonths } from 'date-fns';
import { AskAiChip } from '@/components/ai/ask-ai';
import { BeeStanding } from '@/components/illustrations/bee';
import { MotionButton } from '@/components/motion/motion-button';

// ─── Types ───────────────────────────────────────────────────────────────────
type ReminderStatus = 'pending' | 'dismissed';
type LinkedType = 'Document' | 'Appointment' | 'Bill' | 'Subscription' | 'Task' | 'None';
type FilterTab = 'Pending' | 'Dismissed' | 'All';

interface Reminder {
  id: string;
  title: string;
  dateTime: Date;
  linkedType: LinkedType;
  recurring: boolean;
  recurrenceRule?: string;
  status: ReminderStatus;
}

const LINKED_TYPE_ICONS: Record<LinkedType, React.ElementType> = {
  Document: FileText,
  Appointment: CalendarDays,
  Bill: CreditCard,
  Subscription: RefreshCw,
  Task: CheckCircle,
  None: Bell,
};

const ALL_LINKED_TYPES: LinkedType[] = ['Document', 'Appointment', 'Bill', 'Subscription', 'Task', 'None'];

const today = new Date();

function setTime(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

const INITIAL_REMINDERS: Reminder[] = [
  { id: 'r1', title: 'Renew vehicle registration', dateTime: setTime(addDays(today, 60), 9, 0), linkedType: 'Document', recurring: true, recurrenceRule: 'Annually', status: 'pending' },
  { id: 'r2', title: 'Pay electricity bill', dateTime: setTime(addDays(today, 1), 10, 0), linkedType: 'Bill', recurring: false, status: 'pending' },
  { id: 'r3', title: 'Passport renewal deadline', dateTime: setTime(addMonths(today, 5), 9, 0), linkedType: 'Document', recurring: false, status: 'pending' },
  { id: 'r4', title: 'Dentist appointment tomorrow', dateTime: setTime(addDays(today, 1), 8, 0), linkedType: 'Appointment', recurring: false, status: 'pending' },
  { id: 'r5', title: 'Review gym membership', dateTime: setTime(addDays(today, 2), 12, 0), linkedType: 'Subscription', recurring: false, status: 'pending' },
];

const inputClass =
  'w-full px-3 py-2.5 rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[15px] leading-[22px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25';

export default function RemindersPage() {
  const reduce = useReducedMotion();
  // ─── Theme bug fix per REDESIGN_BRIEF.md §2.5 ─────────────────────────
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  void isDark; // tokens handle theme; reads reactively now

  const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Pending');
  const [modalOpen, setModalOpen] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(format(addDays(today, 1), 'yyyy-MM-dd'));
  const [newTime, setNewTime] = useState('09:00');
  const [newLinkedType, setNewLinkedType] = useState<LinkedType>('None');
  const [newRecurring, setNewRecurring] = useState(false);
  const [newRecurrenceRule, setNewRecurrenceRule] = useState('Monthly');

  const filteredReminders = useMemo(() => {
    let filtered = reminders;
    if (activeFilter === 'Pending') filtered = reminders.filter((r) => r.status === 'pending');
    else if (activeFilter === 'Dismissed') filtered = reminders.filter((r) => r.status === 'dismissed');
    return [...filtered].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  }, [reminders, activeFilter]);

  const pendingCount = useMemo(() => reminders.filter((r) => r.status === 'pending').length, [reminders]);
  const dismissedCount = useMemo(() => reminders.filter((r) => r.status === 'dismissed').length, [reminders]);

  const dismissReminder = (id: string) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'dismissed' as ReminderStatus } : r)));
  };

  const deleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const addReminder = () => {
    if (!newTitle.trim()) return;
    const [h = 0, m = 0] = newTime.split(':').map(Number);
    const dateObj = new Date(newDate);
    dateObj.setHours(h, m, 0, 0);
    const reminder: Reminder = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      dateTime: dateObj,
      linkedType: newLinkedType,
      recurring: newRecurring,
      recurrenceRule: newRecurring ? newRecurrenceRule : undefined,
      status: 'pending',
    };
    setReminders((prev) => [...prev, reminder]);
    resetForm();
    setModalOpen(false);
  };

  const resetForm = () => {
    setNewTitle('');
    setNewDate(format(addDays(today, 1), 'yyyy-MM-dd'));
    setNewTime('09:00');
    setNewLinkedType('None');
    setNewRecurring(false);
    setNewRecurrenceRule('Monthly');
  };

  const filterCounts: Record<FilterTab, number> = {
    Pending: pendingCount,
    Dismissed: dismissedCount,
    All: reminders.length,
  };

  return (
    <div className="max-w-[960px] mx-auto">
      {/* Header */}
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
              <Bell className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
            </div>
            <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Reminders</h1>
          </div>
          <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] ml-[52px]">
            {pendingCount} pending reminder{pendingCount !== 1 ? 's' : ''}
          </p>
        </div>
        <MotionButton
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} />
          Add Reminder
        </MotionButton>
      </header>

      {/* Filter tabs */}
      <div className="mb-6 flex items-center gap-2">
        {(['Pending', 'Dismissed', 'All'] as FilterTab[]).map((tab) => {
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
                  layoutId="reminders-active-tab"
                  className="absolute inset-0 bg-[var(--color-accent)] rounded-[8px]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab}
                <span
                  className={`text-[11px] leading-[14px] font-semibold px-1.5 py-0.5 rounded-[8px] ${
                    isActive ? 'bg-[var(--color-text-on-accent)]/15' : 'bg-[var(--color-surface-2)]'
                  }`}
                >
                  {filterCounts[tab]}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty */}
      {filteredReminders.length === 0 && (
        <div className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-12 flex flex-col items-center text-center">
          <BeeStanding size={96} />
          <h3 className="mt-4 text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
            All quiet on the notification front
          </h3>
          <p className="mt-2 max-w-md text-[15px] leading-[22px] text-[var(--color-text-muted)]">
            {activeFilter === 'Dismissed' ? 'No dismissed reminders to show.' : "We'll buzz you when something needs attention."}
          </p>
          {activeFilter !== 'Dismissed' && (
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <MotionButton
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={1.75} />
                Add Reminder
              </MotionButton>
              <AskAiChip prompt="Help me set up a reminder" label="Ask Laylo to add something" />
            </div>
          )}
        </div>
      )}

      {/* Reminder cards */}
      {filteredReminders.length > 0 && (
        <motion.div layout className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredReminders.map((reminder, index) => {
              const isPending = reminder.status === 'pending';
              const Icon = LINKED_TYPE_ICONS[reminder.linkedType];
              return (
                <motion.div
                  key={reminder.id}
                  layout
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.2, delay: index * 0.04 }}
                  whileHover={reduce ? undefined : { y: -2, rotate: 1.5, scale: 1.01 }}
                  className={`group relative rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 hover:shadow-pop transition-all ${
                    !isPending ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-[16px] leading-[22px] font-semibold text-[var(--color-text)] ${!isPending ? 'line-through' : ''}`}>
                        {reminder.title}
                      </h3>
                      <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] flex items-center gap-1.5 mt-1">
                        <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
                        {format(reminder.dateTime, 'EEE, MMM d, yyyy — h:mm a')}
                      </p>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {reminder.recurring && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-[8px] text-[13px] leading-[18px] font-medium bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                            <Repeat className="w-3.5 h-3.5" strokeWidth={1.75} />
                            {reminder.recurrenceRule}
                          </span>
                        )}
                        {reminder.linkedType !== 'None' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-[8px] text-[13px] leading-[18px] font-medium bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                            <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                            {reminder.linkedType}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-[8px] text-[13px] leading-[18px] font-medium bg-[var(--color-surface-2)] ${
                            isPending ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'
                          }`}
                        >
                          {isPending ? 'Pending' : 'Dismissed'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isPending && (
                        <button
                          onClick={() => dismissReminder(reminder.id)}
                          aria-label="Dismiss"
                          className="p-2 rounded-[8px] text-[var(--color-success)] hover:bg-[var(--color-surface-hover)] transition-colors"
                          title="Dismiss"
                        >
                          <CheckCircle className="w-5 h-5" strokeWidth={1.75} />
                        </button>
                      )}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <AskAiChip prompt="Why was this set?" context={reminder.title} iconOnly label="Ask" />
                        <button
                          onClick={() => deleteReminder(reminder.id)}
                          aria-label="Delete"
                          className="p-2 rounded-[8px] text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-danger)] transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add Reminder Modal */}
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
                  <h2 className="text-[22px] leading-[28px] font-semibold text-[var(--color-text)]">Add Reminder</h2>
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
                      placeholder="What should you be reminded about?"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Date</label>
                      <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Time</label>
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Linked To</label>
                    <select
                      value={newLinkedType}
                      onChange={(e) => setNewLinkedType(e.target.value as LinkedType)}
                      className={inputClass}
                    >
                      {ALL_LINKED_TYPES.map((t) => (
                        <option key={t} value={t}>{t === 'None' ? 'None' : t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)]">Recurring</label>
                      <button
                        type="button"
                        onClick={() => setNewRecurring(!newRecurring)}
                        aria-pressed={newRecurring}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          newRecurring ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-2)]'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            newRecurring ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <AnimatePresence>
                      {newRecurring && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3">
                            <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Recurrence</label>
                            <select
                              value={newRecurrenceRule}
                              onChange={(e) => setNewRecurrenceRule(e.target.value)}
                              className={inputClass}
                            >
                              {['Daily', 'Weekly', 'Biweekly', 'Monthly', 'Quarterly', 'Annually'].map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)]">
                  <button
                    onClick={() => { resetForm(); setModalOpen(false); }}
                    className="px-4 h-10 rounded-[16px] text-[15px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors"
                  >
                    Cancel
                  </button>
                  <MotionButton
                    onClick={addReminder}
                    disabled={!newTitle.trim()}
                    className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" strokeWidth={1.75} />
                    Add Reminder
                  </MotionButton>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
