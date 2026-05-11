'use client';

/**
 * Reminders — Conversational Stack with Time Distance
 * (LAYOUT_REDESIGN_BRIEF §2.8).
 *
 * Group by horizon: Soon (<7d) · This month (<30d) · Later (>30d).
 * Each reminder is a single line with:
 *   - 8px gold dot at left whose opacity decays with distance in time
 *   - title + time row, dismiss/delete chevron on hover
 * A faint vertical gold line connects the dots within a group.
 *
 * On dismiss, the dot grows + a tiny bee flies up off the right edge.
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Bell,
  Plus,
  X,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { format, addDays, addMonths, differenceInDays } from 'date-fns';
import { AskAiChip } from '@/components/ai/ask-ai';
import { BeeStanding } from '@/components/illustrations/bee';
import { MotionButton } from '@/components/motion/motion-button';
import { AmbientBees } from '@/components/motion/ambient-bees';
import { PulseDot } from '@/components/motion/pulse-dot';

// ─── Types ───────────────────────────────────────────────────────────────────
type ReminderStatus = 'pending' | 'dismissed';
type LinkedType = 'Document' | 'Appointment' | 'Bill' | 'Subscription' | 'Task' | 'None';

interface Reminder {
  id: string;
  title: string;
  dateTime: Date;
  linkedType: LinkedType;
  recurring: boolean;
  recurrenceRule?: string;
  status: ReminderStatus;
}

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

type Horizon = 'Soon' | 'This month' | 'Later';

function horizonOf(r: Reminder): Horizon {
  const d = differenceInDays(r.dateTime, today);
  if (d < 7) return 'Soon';
  if (d < 30) return 'This month';
  return 'Later';
}

/**
 * Dot opacity decays linearly with days-out, capped at 25%.
 * tomorrow → 1.0, +30d → ~0.55, +180d → 0.25.
 */
function dotOpacity(r: Reminder): number {
  const d = Math.max(0, differenceInDays(r.dateTime, today));
  const opacity = Math.max(0.25, 1 - d / 60);
  return Math.min(1, opacity);
}

function voiceCopy(r: Reminder): string {
  const day = format(r.dateTime, 'EEEE');
  const t = format(r.dateTime, 'h:mm a');
  return `I'll buzz you on ${day} at ${t} about ${r.title.toLowerCase()}.`;
}

export default function RemindersPage() {
  const reduce = useReducedMotion();
  const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [whisperId, setWhisperId] = useState<string | null>(null);
  const whisperTimer = useRef<number | null>(null);
  const [dismissing, setDismissing] = useState<Record<string, boolean>>({});

  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(format(addDays(today, 1), 'yyyy-MM-dd'));
  const [newTime, setNewTime] = useState('09:00');
  const [newLinkedType, setNewLinkedType] = useState<LinkedType>('None');
  const [newRecurring, setNewRecurring] = useState(false);
  const [newRecurrenceRule, setNewRecurrenceRule] = useState('Monthly');

  const pendingReminders = useMemo(
    () =>
      reminders
        .filter((r) => r.status === 'pending')
        .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime()),
    [reminders],
  );

  const dismissedReminders = useMemo(
    () =>
      reminders
        .filter((r) => r.status === 'dismissed')
        .sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime()),
    [reminders],
  );

  const grouped = useMemo(() => {
    const buckets: Record<Horizon, Reminder[]> = {
      Soon: [],
      'This month': [],
      Later: [],
    };
    pendingReminders.forEach((r) => {
      buckets[horizonOf(r)].push(r);
    });
    return buckets;
  }, [pendingReminders]);

  useEffect(() => {
    return () => {
      if (whisperTimer.current) window.clearTimeout(whisperTimer.current);
    };
  }, []);

  const dismissReminder = (id: string) => {
    setDismissing((p) => ({ ...p, [id]: true }));
    window.setTimeout(() => {
      setReminders((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: 'dismissed' as ReminderStatus } : r,
        ),
      );
      setDismissing((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }, 400);
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

  const handleHover = (id: string) => {
    setHoveredId(id);
    if (whisperTimer.current) window.clearTimeout(whisperTimer.current);
    whisperTimer.current = window.setTimeout(() => setWhisperId(id), 800);
  };

  const handleHoverEnd = () => {
    setHoveredId(null);
    if (whisperTimer.current) {
      window.clearTimeout(whisperTimer.current);
      whisperTimer.current = null;
    }
    setWhisperId(null);
  };

  return (
    <div className="max-w-[760px] mx-auto">
      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
              <Bell className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
              {pendingReminders.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5">
                  <PulseDot size={8} />
                </span>
              )}
            </div>
            <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Reminders</h1>
          </div>
          <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] ml-[52px]">
            {pendingReminders.length} on the horizon
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

      {/* Empty */}
      {pendingReminders.length === 0 && dismissedReminders.length === 0 && (
        <div className="relative overflow-hidden rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-12 flex flex-col items-center text-center">
          {/* "Nothing to remind you of" — one slow bee says it for us. */}
          <AmbientBees count={1} speed="slow" />
          <BeeStanding size={96} />
          <h3 className="mt-4 text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
            All quiet on the notification front
          </h3>
          <p className="mt-2 max-w-md text-[15px] leading-[22px] text-[var(--color-text-muted)]">
            We&apos;ll buzz you when something needs attention.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <MotionButton
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              Add Reminder
            </MotionButton>
            <AskAiChip prompt="Help me set up a reminder" label="Ask BillBee to add something" />
          </div>
        </div>
      )}

      {/* Conversational stack — grouped by horizon */}
      {(['Soon', 'This month', 'Later'] as Horizon[]).map((horizon) => {
        const items = grouped[horizon];
        if (items.length === 0) return null;
        return (
          <section key={horizon} className="mb-8">
            <h2 className="text-[22px] leading-[28px] font-semibold text-[var(--color-text)] mb-3 flex items-baseline gap-2">
              {horizon}
              <span className="text-[13px] leading-[18px] font-medium text-[var(--color-text-subtle)] tabular-nums">
                {items.length}
              </span>
            </h2>
            <div className="relative pl-3">
              {/* Threaded gold line */}
              <div
                aria-hidden="true"
                className="absolute left-[5px] top-2 bottom-2 w-[1px]"
                style={{ background: 'var(--color-accent)', opacity: 0.15 }}
              />
              <ul className="space-y-1">
                <AnimatePresence>
                  {items.map((r) => {
                    const isDismissing = dismissing[r.id];
                    const isHovered = hoveredId === r.id;
                    return (
                      <motion.li
                        key={r.id}
                        layout
                        initial={false}
                        animate={
                          isDismissing
                            ? { height: 0, opacity: 0 }
                            : { height: 'auto', opacity: 1 }
                        }
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        onMouseEnter={() => handleHover(r.id)}
                        onMouseLeave={handleHoverEnd}
                        className="relative overflow-hidden"
                      >
                        <div className="relative flex items-start gap-3 py-2 group">
                          {/* Gold dot — opacity decays with time-out */}
                          <div className="relative w-3 flex-shrink-0 mt-2">
                            <motion.div
                              animate={
                                isDismissing && !reduce
                                  ? { scale: [1, 2, 0], opacity: [1, 1, 0] }
                                  : undefined
                              }
                              transition={{ duration: 0.4 }}
                              className="absolute -left-[7px] top-0 w-3 h-3 rounded-full"
                              style={{
                                background: 'var(--color-accent)',
                                opacity: dotOpacity(r),
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-3">
                              <p className="text-[15px] leading-[22px] font-medium text-[var(--color-text)]">
                                {r.title}
                              </p>
                              <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] flex-shrink-0 tabular-nums">
                                {format(r.dateTime, 'MMM d · h:mm a')}
                              </p>
                            </div>
                            <AnimatePresence>
                              {isHovered && (
                                <motion.p
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="text-[13px] leading-[18px] text-[var(--color-text-subtle)] italic mt-1"
                                >
                                  “{voiceCopy(r)}”
                                </motion.p>
                              )}
                            </AnimatePresence>
                            <div
                              className={`flex items-center gap-1 mt-1 transition-opacity ${
                                isHovered ? 'opacity-100' : 'opacity-0'
                              }`}
                            >
                              <button
                                onClick={() => dismissReminder(r.id)}
                                aria-label="Dismiss"
                                className="inline-flex items-center gap-1 text-[11px] leading-[14px] font-medium text-[var(--color-success)] px-2 py-0.5 rounded-[8px] hover:bg-[var(--color-surface-hover)] transition-colors"
                              >
                                <CheckCircle className="w-3 h-3" strokeWidth={1.75} />
                                Dismiss
                              </button>
                              <button
                                onClick={() => deleteReminder(r.id)}
                                aria-label="Delete"
                                className="inline-flex items-center gap-1 text-[11px] leading-[14px] font-medium text-[var(--color-text-subtle)] hover:text-[var(--color-danger)] px-2 py-0.5 rounded-[8px] hover:bg-[var(--color-surface-hover)] transition-colors"
                              >
                                <Trash2 className="w-3 h-3" strokeWidth={1.75} />
                                Delete
                              </button>
                              <AskAiChip
                                prompt="Why was this set?"
                                context={r.title}
                                iconOnly
                                label="Ask"
                              />
                            </div>
                          </div>
                        </div>
                        {/* Bee whisper — flies off the right edge during dismiss */}
                        {isDismissing && !reduce && (
                          <motion.div
                            initial={{ x: 0, y: 0, opacity: 1 }}
                            animate={{ x: 200, y: -40, opacity: 0 }}
                            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                            className="absolute right-2 top-1 pointer-events-none"
                          >
                            <BeeStanding size={20} />
                          </motion.div>
                        )}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </div>
          </section>
        );
      })}

      {/* Dismissed footer */}
      {dismissedReminders.length > 0 && (
        <details className="mt-8">
          <summary className="text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)] transition-colors">
            Dismissed ({dismissedReminders.length})
          </summary>
          <ul className="mt-3 pl-3 space-y-1.5">
            {dismissedReminders.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 text-[13px] leading-[18px] text-[var(--color-text-subtle)] line-through"
              >
                <span
                  className="w-2 h-2 rounded-full bg-[var(--color-text-subtle)]"
                  aria-hidden="true"
                />
                {r.title}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Bee whisper on long-hover */}
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
