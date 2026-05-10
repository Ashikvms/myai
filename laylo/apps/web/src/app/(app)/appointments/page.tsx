'use client';

/**
 * Appointments page — REDESIGN_BRIEF.md §2.6.
 * - Per-category gradient table replaced with single Lucide icon in gold.
 * - Per-card AskAi chip ("Help me prep").
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  CalendarDays,
  Plus,
  X,
  MapPin,
  Bell,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Stethoscope,
  Car,
  Calculator,
  User,
  Briefcase,
} from 'lucide-react';
import { format, addDays, addWeeks, isBefore, startOfDay } from 'date-fns';
import { AskAiChip } from '@/components/ai/ask-ai';
import { BeeStanding } from '@/components/illustrations/bee';
import { MotionButton } from '@/components/motion/motion-button';

// ─── Types ───────────────────────────────────────────────────────────────────
type ApptCategory = 'Health' | 'Finance' | 'Car' | 'Personal' | 'Work' | 'Other';

interface Appointment {
  id: string;
  title: string;
  dateTime: Date;
  endTime?: Date;
  location: string;
  category: ApptCategory;
  reminderMinutes: number;
  notes?: string;
}

const CATEGORY_ICONS: Record<ApptCategory, React.ElementType> = {
  Health: Stethoscope,
  Finance: Calculator,
  Car: Car,
  Personal: User,
  Work: Briefcase,
  Other: CalendarDays,
};

const ALL_CATEGORIES: ApptCategory[] = ['Health', 'Finance', 'Car', 'Personal', 'Work', 'Other'];
const REMINDER_OPTIONS = [
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
];

const today = startOfDay(new Date());

function setTime(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: 'a1', title: 'Tax Consultation', dateTime: setTime(addWeeks(today, 2), 10, 0), endTime: setTime(addWeeks(today, 2), 11, 0), location: 'H&R Block — 123 Main St', category: 'Finance', reminderMinutes: 60, notes: "Bring W-2, 1099 forms, and last year's return." },
  { id: 'a2', title: 'Dentist Cleaning', dateTime: setTime(addWeeks(today, 3), 14, 30), endTime: setTime(addWeeks(today, 3), 15, 30), location: 'Bright Smile Dental — 456 Oak Ave', category: 'Health', reminderMinutes: 60, notes: 'Regular 6-month checkup and cleaning.' },
  { id: 'a3', title: 'Eye Exam', dateTime: setTime(addDays(today, 24), 9, 0), endTime: setTime(addDays(today, 24), 10, 0), location: 'Vision Center — 789 Elm Blvd', category: 'Health', reminderMinutes: 120, notes: 'Annual eye exam. Bring current glasses.' },
  { id: 'a4', title: 'Car Service — Oil Change', dateTime: setTime(addWeeks(today, 6), 8, 0), endTime: setTime(addWeeks(today, 6), 9, 30), location: 'Quick Lube — 321 Auto Way', category: 'Car', reminderMinutes: 60, notes: 'Oil change + tire rotation. 30k mile service.' },
  { id: 'a5', title: 'Annual Physical', dateTime: setTime(addDays(today, -10), 11, 0), endTime: setTime(addDays(today, -10), 12, 0), location: 'City Health Clinic — 555 Health Dr', category: 'Health', reminderMinutes: 60, notes: 'Completed. Follow up on lab results.' },
];

function getReminderLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min before`;
  const hrs = minutes / 60;
  return `${hrs} hour${hrs > 1 ? 's' : ''} before`;
}

const inputClass =
  'w-full px-3 py-2.5 rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[15px] leading-[22px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25';

export default function AppointmentsPage() {
  const reduce = useReducedMotion();
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [modalOpen, setModalOpen] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(format(addDays(today, 1), 'yyyy-MM-dd'));
  const [newTime, setNewTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState<ApptCategory>('Personal');
  const [newReminder, setNewReminder] = useState(60);
  const [newNotes, setNewNotes] = useState('');

  const now = new Date();
  const upcomingAppointments = useMemo(
    () => appointments.filter((a) => !isBefore(a.dateTime, now)).sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime()),
    [appointments, now],
  );
  const pastAppointments = useMemo(
    () => appointments.filter((a) => isBefore(a.dateTime, now)).sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime()),
    [appointments, now],
  );

  const addAppointment = () => {
    if (!newTitle.trim()) return;
    const [startH = 0, startM = 0] = newTime.split(':').map(Number);
    const [endH = 0, endM = 0] = newEndTime.split(':').map(Number);
    const dateObj = new Date(newDate);
    const appt: Appointment = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      dateTime: setTime(dateObj, startH, startM),
      endTime: setTime(dateObj, endH, endM),
      location: newLocation.trim(),
      category: newCategory,
      reminderMinutes: newReminder,
      notes: newNotes.trim() || undefined,
    };
    setAppointments((prev) => [...prev, appt]);
    resetForm();
    setModalOpen(false);
  };

  const deleteAppointment = (id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  const resetForm = () => {
    setNewTitle('');
    setNewDate(format(addDays(today, 1), 'yyyy-MM-dd'));
    setNewTime('09:00');
    setNewEndTime('10:00');
    setNewLocation('');
    setNewCategory('Personal');
    setNewReminder(60);
    setNewNotes('');
  };

  const renderTimelineCard = (appt: Appointment, index: number, isPast: boolean) => {
    const Icon = CATEGORY_ICONS[appt.category];
    const isExpanded = expandedId === appt.id;
    return (
      <motion.div
        key={appt.id}
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.04 }}
        className={`relative flex gap-4 ${isPast ? 'opacity-60' : ''}`}
      >
        <div className="flex flex-col items-center flex-shrink-0 w-8">
          <div
            className={`w-3.5 h-3.5 rounded-full border-2 mt-6 ${
              isPast
                ? 'border-[var(--color-border-strong)] bg-[var(--color-surface-2)]'
                : 'border-[var(--color-accent)] bg-[var(--color-accent)]'
            }`}
          />
          <div className="w-0.5 flex-1 mt-1 bg-[var(--color-border)]" />
        </div>
        <motion.div
          whileHover={reduce ? undefined : { y: -2, rotate: 1.5, scale: 1.01 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="group flex-1 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 mb-4 hover:shadow-pop transition-shadow">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[var(--color-accent)]" strokeWidth={1.75} />
                </div>
                <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">{appt.title}</h3>
              </div>
              <p className="text-[15px] leading-[22px] text-[var(--color-text)] font-medium">
                {format(appt.dateTime, 'EEEE, MMMM d, yyyy')}
                <span className="ml-2 text-[var(--color-text-muted)] font-normal">
                  {format(appt.dateTime, 'h:mm a')}
                  {appt.endTime && ` – ${format(appt.endTime, 'h:mm a')}`}
                </span>
              </p>
              {appt.location && (
                <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] flex items-center gap-1.5 mt-2">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{appt.location}</span>
                </p>
              )}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                  {appt.category}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-[8px] text-[13px] leading-[18px] font-medium bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                  <Bell className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {getReminderLabel(appt.reminderMinutes)}
                </span>
                <AskAiChip prompt="Help me prep" context={`Appointment: ${appt.title}`} label="Help me prep" />
              </div>
              {appt.notes && (
                <div className="mt-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : appt.id)}
                    className="flex items-center gap-1 text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.75} /> : <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.75} />}
                    {isExpanded ? 'Hide notes' : 'Show notes'}
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] mt-2">{appt.notes}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
            <button
              onClick={() => deleteAppointment(appt.id)}
              aria-label="Delete"
              className="p-1.5 rounded-[8px] text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-danger)] transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-[960px] mx-auto">
      {/* Header */}
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
            </div>
            <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Appointments</h1>
          </div>
          <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] ml-[52px]">
            {upcomingAppointments.length} upcoming appointment{upcomingAppointments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <MotionButton
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} />
          Add Appointment
        </MotionButton>
      </header>

      {/* Empty */}
      {appointments.length === 0 && (
        <div className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-12 flex flex-col items-center text-center">
          <BeeStanding size={96} />
          <h3 className="mt-4 text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
            Calendar&apos;s clear. Enjoy the open hive.
          </h3>
          <p className="mt-2 max-w-md text-[15px] leading-[22px] text-[var(--color-text-muted)]">
            Schedule your first appointment to stay on top of your week.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              Add Appointment
            </button>
            <AskAiChip prompt="Help me schedule something" label="Ask Laylo to add something" />
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingAppointments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[13px] leading-[18px] font-semibold text-[var(--color-text-muted)] mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" strokeWidth={1.75} />
            Upcoming
          </h2>
          <div>{upcomingAppointments.map((appt, index) => renderTimelineCard(appt, index, false))}</div>
        </div>
      )}

      {/* Past */}
      {pastAppointments.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast(!showPast)}
            className="flex items-center gap-2 text-[13px] leading-[18px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-4 transition-colors"
          >
            {showPast ? <ChevronUp className="w-4 h-4" strokeWidth={1.75} /> : <ChevronDown className="w-4 h-4" strokeWidth={1.75} />}
            Past ({pastAppointments.length})
          </button>
          <AnimatePresence>
            {showPast && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                {pastAppointments.map((appt, index) => renderTimelineCard(appt, index, true))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Add Appointment Modal */}
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
                  <h2 className="text-[22px] leading-[28px] font-semibold text-[var(--color-text)]">Add Appointment</h2>
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
                    <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Appointment title" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Date</label>
                    <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Start Time</label>
                      <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">End Time</label>
                      <input type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Location</label>
                    <input type="text" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Address or location name" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Category</label>
                      <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as ApptCategory)} className={inputClass}>
                        {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Reminder</label>
                      <select value={newReminder} onChange={(e) => setNewReminder(Number(e.target.value))} className={inputClass}>
                        {REMINDER_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] mb-1.5">Notes</label>
                    <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Additional notes…" rows={3} className={`${inputClass} resize-none`} />
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
                    onClick={addAppointment}
                    disabled={!newTitle.trim()}
                    className="flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" strokeWidth={1.75} />
                    Add Appointment
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
