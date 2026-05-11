'use client';

/**
 * Appointments — Calendar Ribbon + Day Cards
 * (LAYOUT_REDESIGN_BRIEF §2.9).
 *
 * Top: 14-day horizontal scroll-snap ribbon (today + 13 ahead). Each day is
 * a column with weekday + date and 0-3 gold dots showing # of appts.
 * Today gets a thin gold underline (layoutId="appt-today") + breathing halo.
 *
 * Below: day-grouped cards with h2 day header and time-left layout.
 */
import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  CalendarDays,
  Plus,
  X,
  MapPin,
  Bell,
  ChevronDown,
  ChevronUp,
  Trash2,
  Stethoscope,
  Car,
  Calculator,
  User,
  Briefcase,
} from 'lucide-react';
import {
  format,
  addDays,
  isBefore,
  startOfDay,
  isSameDay,
} from 'date-fns';
import { AskAiChip } from '@/components/ai/ask-ai';
import { BeeStanding } from '@/components/illustrations/bee';
import { MotionButton } from '@/components/motion/motion-button';
import { AmbientBees } from '@/components/motion/ambient-bees';
import { HoneycombPattern } from '@/components/illustrations/honeycomb-pattern';
import { HexFrame } from '@/components/layout/hex-frame';

const HEX_CLIP = 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)';

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
  { id: 'a1', title: 'Tax Consultation', dateTime: setTime(addDays(today, 14), 10, 0), endTime: setTime(addDays(today, 14), 11, 0), location: 'H&R Block — 123 Main St', category: 'Finance', reminderMinutes: 60, notes: "Bring W-2, 1099 forms, and last year's return." },
  { id: 'a2', title: 'Dentist Cleaning', dateTime: setTime(addDays(today, 7), 14, 30), endTime: setTime(addDays(today, 7), 15, 30), location: 'Bright Smile Dental — 456 Oak Ave', category: 'Health', reminderMinutes: 60, notes: 'Regular 6-month checkup and cleaning.' },
  { id: 'a3', title: 'Eye Exam', dateTime: setTime(addDays(today, 3), 9, 0), endTime: setTime(addDays(today, 3), 10, 0), location: 'Vision Center — 789 Elm Blvd', category: 'Health', reminderMinutes: 120, notes: 'Annual eye exam. Bring current glasses.' },
  { id: 'a4', title: 'Car Service — Oil Change', dateTime: setTime(addDays(today, 21), 8, 0), endTime: setTime(addDays(today, 21), 9, 30), location: 'Quick Lube — 321 Auto Way', category: 'Car', reminderMinutes: 60, notes: 'Oil change + tire rotation. 30k mile service.' },
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
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const dayRefs = useRef<Map<string, HTMLElement>>(new Map());

  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(format(addDays(today, 1), 'yyyy-MM-dd'));
  const [newTime, setNewTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState<ApptCategory>('Personal');
  const [newReminder, setNewReminder] = useState(60);
  const [newNotes, setNewNotes] = useState('');

  // 14-day ribbon
  const ribbonDays = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDays(today, i)),
    [],
  );

  const apptsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((a) => {
      const key = format(a.dateTime, 'yyyy-MM-dd');
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    });
    return map;
  }, [appointments]);

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((a) => !isBefore(startOfDay(a.dateTime), today))
        .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime()),
    [appointments],
  );
  const pastAppointments = useMemo(
    () =>
      appointments
        .filter((a) => isBefore(startOfDay(a.dateTime), today))
        .sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime()),
    [appointments],
  );

  const upcomingByDay = useMemo(() => {
    const days: { date: Date; items: Appointment[] }[] = [];
    upcomingAppointments.forEach((a) => {
      const key = format(a.dateTime, 'yyyy-MM-dd');
      const last = days[days.length - 1];
      if (last && format(last.date, 'yyyy-MM-dd') === key) {
        last.items.push(a);
      } else {
        days.push({ date: startOfDay(a.dateTime), items: [a] });
      }
    });
    return days;
  }, [upcomingAppointments]);

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

  const scrollToDay = (date: Date) => {
    setSelectedDay(date);
    const key = format(date, 'yyyy-MM-dd');
    const el = dayRefs.current.get(key);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="relative max-w-[1024px] mx-auto">
      {/* Hive theme — honeycomb wash sits behind the page */}
      <HoneycombPattern opacity={0.04} />
      {/* Header */}
      <header className="relative mb-6 flex items-start justify-between gap-4 flex-wrap overflow-hidden">
        {/* Single ambient bee in the hero band only */}
        <AmbientBees count={1} speed="slow" />
        <div>
          <div className="flex items-center gap-3 mb-2">
            <HexFrame size={40}>
              <CalendarDays className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
            </HexFrame>
            <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Appointments</h1>
          </div>
          <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] ml-[52px]">
            {upcomingAppointments.length} on the calendar
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

      {/* Calendar Ribbon */}
      {appointments.length > 0 && (
        <div className="mb-8 -mx-4 px-4">
          <div
            className="flex items-stretch gap-2 overflow-x-auto pb-2 snap-x snap-mandatory"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {ribbonDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const items = apptsByDay.get(key) ?? [];
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDay);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => scrollToDay(day)}
                  className="relative flex-shrink-0 w-[68px] snap-start group focus:outline-none"
                  aria-label={format(day, 'EEEE, MMMM d')}
                >
                  {/* Today's breathing halo */}
                  {isToday && !reduce && (
                    <motion.div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-[16px]"
                      animate={{ opacity: [0.15, 0.25, 0.15] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      style={{
                        background:
                          'radial-gradient(circle at center, rgba(255,215,0,0.6) 0%, rgba(255,215,0,0) 70%)',
                      }}
                    />
                  )}
                  <div
                    className={`relative flex flex-col items-center py-3 rounded-[16px] border transition-colors ${
                      isSelected
                        ? 'border-[var(--color-accent)] bg-[var(--color-surface)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]'
                    }`}
                  >
                    <span className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                      {format(day, 'EEE')}
                    </span>
                    <span
                      className={`text-[18px] leading-[22px] font-semibold mt-1 tabular-nums ${
                        isToday ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    <div className="flex items-center gap-0.5 mt-2 h-1.5">
                      {items.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5"
                          style={{
                            clipPath: HEX_CLIP,
                            WebkitClipPath: HEX_CLIP,
                            background: 'var(--color-accent)',
                          }}
                        />
                      ))}
                      {items.length === 0 && (
                        <div
                          className="w-1.5 h-1.5"
                          style={{
                            clipPath: HEX_CLIP,
                            WebkitClipPath: HEX_CLIP,
                            background: 'var(--color-border-strong)',
                          }}
                        />
                      )}
                    </div>
                    {isToday && (
                      <motion.div
                        layoutId="appt-today"
                        className="absolute bottom-0 left-3 right-3 h-[2px] bg-[var(--color-accent)] rounded-full"
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
            <AskAiChip prompt="Help me schedule something" label="Ask BillBee to add something" />
          </div>
        </div>
      )}

      {/* Day-grouped cards */}
      {upcomingByDay.map(({ date, items }) => {
        const key = format(date, 'yyyy-MM-dd');
        return (
          <section
            key={key}
            ref={(el) => {
              if (el) dayRefs.current.set(key, el);
              else dayRefs.current.delete(key);
            }}
            className="mb-8"
          >
            <h2 className="text-[22px] leading-[28px] font-semibold text-[var(--color-text)] mb-3 flex items-baseline gap-2">
              {format(date, 'EEE, MMMM d')}
              <span className="text-[13px] leading-[18px] font-medium text-[var(--color-text-subtle)]">
                · {items.length} appointment{items.length !== 1 ? 's' : ''}
              </span>
            </h2>
            <div className="space-y-3">
              {items.map((appt) => {
                const Icon = CATEGORY_ICONS[appt.category];
                return (
                  <motion.div
                    key={appt.id}
                    whileHover={reduce ? undefined : { y: -2, rotate: 1.5, scale: 1.005 }}
                    transition={{ duration: 0.2 }}
                    className="group rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 hover:shadow-pop transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-end flex-shrink-0 w-[80px]">
                        <p className="text-[18px] leading-[22px] font-semibold text-[var(--color-text)] tabular-nums">
                          {format(appt.dateTime, 'h:mm a')}
                        </p>
                        {appt.endTime && (
                          <p className="text-[11px] leading-[14px] text-[var(--color-text-subtle)] tabular-nums">
                            – {format(appt.endTime, 'h:mm a')}
                          </p>
                        )}
                      </div>
                      <div
                        aria-hidden="true"
                        className="w-[2px] flex-shrink-0 self-stretch bg-[var(--color-border)]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <HexFrame size={28} fill="var(--color-surface-2)">
                            <Icon className="w-3.5 h-3.5 text-[var(--color-accent)]" strokeWidth={1.75} />
                          </HexFrame>
                          <span className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                            {appt.category}
                          </span>
                        </div>
                        <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
                          {appt.title}
                        </h3>
                        {appt.location && (
                          <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] flex items-center gap-1.5 mt-1">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
                            <span className="truncate">{appt.location}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[11px] leading-[14px] text-[var(--color-text-subtle)]">
                            <Bell className="w-3 h-3" strokeWidth={1.75} />
                            {getReminderLabel(appt.reminderMinutes)}
                          </span>
                          <AskAiChip
                            prompt="Help me prep"
                            context={`Appointment: ${appt.title}`}
                            label="Help me prep"
                          />
                        </div>
                        {appt.notes && (
                          <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] mt-3 italic">
                            {appt.notes}
                          </p>
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
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Past expander */}
      {pastAppointments.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast(!showPast)}
            className="flex items-center gap-2 text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-4 transition-colors"
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
                <ul className="space-y-1.5 text-[13px] leading-[18px] text-[var(--color-text-subtle)]">
                  {pastAppointments.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 line-through">
                      <span className="tabular-nums">{format(a.dateTime, 'MMM d')}</span>
                      <span>—</span>
                      <span>{a.title}</span>
                    </li>
                  ))}
                </ul>
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
                    Lock it in
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
