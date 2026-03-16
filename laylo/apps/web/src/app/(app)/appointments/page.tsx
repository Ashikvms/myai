'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Plus,
  X,
  MapPin,
  Bell,
  Clock,
  ChevronDown,
  ChevronUp,
  Inbox,
  Trash2,
  Stethoscope,
  Car,
  Calculator,
  Eye,
  User,
  Briefcase,
  MoreHorizontal,
} from 'lucide-react';
import { format, addDays, addWeeks, isBefore, startOfDay } from 'date-fns';

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

// ─── Category Config ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<ApptCategory, {
  gradient: string;
  bg: string;
  darkBg: string;
  text: string;
  darkText: string;
  icon: React.ElementType;
}> = {
  Health: {
    gradient: 'from-red-500 to-red-600',
    bg: 'bg-red-50',
    darkBg: 'bg-red-900/30',
    text: 'text-red-700',
    darkText: 'text-red-400',
    icon: Stethoscope,
  },
  Finance: {
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-50',
    darkBg: 'bg-green-900/30',
    text: 'text-green-700',
    darkText: 'text-green-400',
    icon: Calculator,
  },
  Car: {
    gradient: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50',
    darkBg: 'bg-amber-900/30',
    text: 'text-amber-700',
    darkText: 'text-amber-400',
    icon: Car,
  },
  Personal: {
    gradient: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50',
    darkBg: 'bg-purple-900/30',
    text: 'text-purple-700',
    darkText: 'text-purple-400',
    icon: User,
  },
  Work: {
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    darkBg: 'bg-blue-900/30',
    text: 'text-blue-700',
    darkText: 'text-blue-400',
    icon: Briefcase,
  },
  Other: {
    gradient: 'from-gray-500 to-gray-600',
    bg: 'bg-gray-50',
    darkBg: 'bg-gray-900/30',
    text: 'text-gray-700',
    darkText: 'text-gray-400',
    icon: CalendarDays,
  },
};

const ALL_CATEGORIES: ApptCategory[] = ['Health', 'Finance', 'Car', 'Personal', 'Work', 'Other'];
const REMINDER_OPTIONS = [
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
];

// ─── Demo Data ───────────────────────────────────────────────────────────────

const today = startOfDay(new Date());

function setTime(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'a1',
    title: 'Tax Consultation',
    dateTime: setTime(addWeeks(today, 2), 10, 0),
    endTime: setTime(addWeeks(today, 2), 11, 0),
    location: 'H&R Block — 123 Main St',
    category: 'Finance',
    reminderMinutes: 60,
    notes: 'Bring W-2, 1099 forms, and last year\'s return.',
  },
  {
    id: 'a2',
    title: 'Dentist Cleaning',
    dateTime: setTime(addWeeks(today, 3), 14, 30),
    endTime: setTime(addWeeks(today, 3), 15, 30),
    location: 'Bright Smile Dental — 456 Oak Ave',
    category: 'Health',
    reminderMinutes: 60,
    notes: 'Regular 6-month checkup and cleaning.',
  },
  {
    id: 'a3',
    title: 'Eye Exam',
    dateTime: setTime(addDays(today, 24), 9, 0),
    endTime: setTime(addDays(today, 24), 10, 0),
    location: 'Vision Center — 789 Elm Blvd',
    category: 'Health',
    reminderMinutes: 120,
    notes: 'Annual eye exam. Bring current glasses.',
  },
  {
    id: 'a4',
    title: 'Car Service — Oil Change',
    dateTime: setTime(addWeeks(today, 6), 8, 0),
    endTime: setTime(addWeeks(today, 6), 9, 30),
    location: 'Quick Lube — 321 Auto Way',
    category: 'Car',
    reminderMinutes: 60,
    notes: 'Oil change + tire rotation. 30k mile service.',
  },
  {
    id: 'a5',
    title: 'Annual Physical',
    dateTime: setTime(addDays(today, -10), 11, 0),
    endTime: setTime(addDays(today, -10), 12, 0),
    location: 'City Health Clinic — 555 Health Dr',
    category: 'Health',
    reminderMinutes: 60,
    notes: 'Completed. Follow up on lab results.',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getReminderLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min before`;
  const hrs = minutes / 60;
  return `${hrs} hour${hrs > 1 ? 's' : ''} before`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [modalOpen, setModalOpen] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New appointment form state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(format(addDays(today, 1), 'yyyy-MM-dd'));
  const [newTime, setNewTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState<ApptCategory>('Personal');
  const [newReminder, setNewReminder] = useState(60);
  const [newNotes, setNewNotes] = useState('');

  // Dark mode detection
  const [dark, setDark] = useState(false);
  useState(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDark(isDark);
      const observer = new MutationObserver(() => {
        setDark(document.documentElement.classList.contains('dark'));
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
  });

  // Separate upcoming and past
  const now = new Date();
  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((a) => !isBefore(a.dateTime, now))
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  }, [appointments, now]);

  const pastAppointments = useMemo(() => {
    return appointments
      .filter((a) => isBefore(a.dateTime, now))
      .sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime());
  }, [appointments, now]);

  // Styles
  const pageBg = dark ? 'bg-[#0F0F0F]' : 'bg-[#FAFAFA]';
  const cardBg = dark ? 'bg-[#1A1A1A]' : 'bg-white';
  const cardBorder = dark ? 'border-white/5' : 'border-gray-100';
  const textPrimary = dark ? 'text-white' : 'text-gray-900';
  const textSecondary = dark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = dark ? 'text-gray-500' : 'text-gray-400';
  const inputStyle = dark
    ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-indigo-500'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-500';

  // Handlers
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

  // ─── Timeline Card ─────────────────────────────────────────────────────

  const renderTimelineCard = (appt: Appointment, index: number, isPast: boolean) => {
    const config = CATEGORY_CONFIG[appt.category];
    const isExpanded = expandedId === appt.id;

    return (
      <motion.div
        key={appt.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.08 }}
        className={`relative flex gap-4 ${isPast ? 'opacity-50' : ''}`}
      >
        {/* Timeline Line + Dot */}
        <div className="flex flex-col items-center flex-shrink-0 w-8">
          <div
            className={`w-3.5 h-3.5 rounded-full border-2 mt-6 ${
              isPast
                ? dark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-200'
                : 'border-indigo-500 bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30'
            }`}
          />
          <div
            className={`w-0.5 flex-1 mt-1 ${
              dark ? 'bg-white/5' : 'bg-gray-200'
            }`}
          />
        </div>

        {/* Card */}
        <div
          className={`flex-1 rounded-2xl border ${cardBorder} ${cardBg} p-5 mb-4 transition-all hover:shadow-lg ${
            dark ? 'hover:border-white/10' : 'hover:border-gray-200 hover:shadow-gray-200/50'
          } group`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className={`text-base font-semibold mb-1 ${textPrimary}`}>{appt.title}</h3>

              {/* Date/Time */}
              <p className={`text-sm mb-2 ${dark ? 'text-indigo-400' : 'text-indigo-600'} font-medium`}>
                {format(appt.dateTime, 'EEEE, MMMM d, yyyy')}
                <span className={`ml-2 ${textSecondary}`}>
                  {format(appt.dateTime, 'h:mm a')}
                  {appt.endTime && ` \u2013 ${format(appt.endTime, 'h:mm a')}`}
                </span>
              </p>

              {/* Location */}
              {appt.location && (
                <p className={`text-sm flex items-center gap-1.5 mb-2 ${textSecondary}`}>
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{appt.location}</span>
                </p>
              )}

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                    dark ? `${config.darkBg} ${config.darkText}` : `${config.bg} ${config.text}`
                  }`}
                >
                  <config.icon className="w-3 h-3" />
                  {appt.category}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                    dark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Bell className="w-3 h-3" />
                  {getReminderLabel(appt.reminderMinutes)}
                </span>
              </div>

              {/* Expandable Notes */}
              {appt.notes && (
                <div className="mt-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : appt.id)}
                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                      dark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
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
                        <p className={`text-sm mt-2 ${textSecondary}`}>{appt.notes}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Actions */}
            <button
              onClick={() => deleteAppointment(appt.id)}
              className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                dark ? 'hover:bg-red-900/30 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen ${pageBg} transition-colors duration-300`}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-8 pb-12">
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
                  <CalendarDays className="w-6 h-6 text-white" />
                </div>
                <h1 className={`text-3xl font-bold ${textPrimary}`}>Appointments</h1>
              </div>
              <p className={`text-sm ${textSecondary} ml-[52px]`}>
                {upcomingAppointments.length} upcoming appointment{upcomingAppointments.length !== 1 ? 's' : ''}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
            >
              <Plus className="w-4 h-4" />
              Add Appointment
            </motion.button>
          </div>
        </motion.div>

        {/* ── Empty State ─────────────────────────────────────────────── */}
        {appointments.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className={`rounded-2xl border ${cardBorder} ${cardBg} p-12 text-center`}
          >
            <div className={`inline-flex p-4 rounded-2xl mb-4 ${dark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <Inbox className={`w-10 h-10 ${textMuted}`} />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>No appointments yet</h3>
            <p className={`text-sm mb-6 ${textSecondary}`}>
              Schedule your first appointment to stay on top of your calendar.
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25"
            >
              <Plus className="w-4 h-4" />
              Add Appointment
            </motion.button>
          </motion.div>
        )}

        {/* ── Upcoming Timeline ───────────────────────────────────────── */}
        {upcomingAppointments.length > 0 && (
          <div className="mb-8">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
                dark ? 'text-indigo-400' : 'text-indigo-600'
              }`}
            >
              <Clock className="w-4 h-4" />
              Upcoming
            </motion.h2>
            <div>
              {upcomingAppointments.map((appt, index) =>
                renderTimelineCard(appt, index, false)
              )}
            </div>
          </div>
        )}

        {/* ── Past Appointments ────────────────────────────────────────── */}
        {pastAppointments.length > 0 && (
          <div>
            <button
              onClick={() => setShowPast(!showPast)}
              className={`flex items-center gap-2 text-sm font-semibold mb-4 transition-colors ${
                dark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
              }`}
            >
              {showPast ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Past ({pastAppointments.length})
            </button>
            <AnimatePresence>
              {showPast && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  {pastAppointments.map((appt, index) =>
                    renderTimelineCard(appt, index, true)
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Add Appointment Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed z-50 inset-x-4 top-[5%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg"
            >
              <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
                {/* Modal Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${cardBorder}`}>
                  <h2 className={`text-lg font-semibold ${textPrimary}`}>Add Appointment</h2>
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
                      placeholder="Appointment title"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none ${inputStyle}`}
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Date</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none ${inputStyle}`}
                    />
                  </div>

                  {/* Start Time + End Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Start Time</label>
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>End Time</label>
                      <input
                        type="time"
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none ${inputStyle}`}
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Location</label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="Address or location name"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none ${inputStyle}`}
                    />
                  </div>

                  {/* Category + Reminder */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Category</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as ApptCategory)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none appearance-none cursor-pointer ${inputStyle}`}
                      >
                        {ALL_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Reminder</label>
                      <select
                        value={newReminder}
                        onChange={(e) => setNewReminder(Number(e.target.value))}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none appearance-none cursor-pointer ${inputStyle}`}
                      >
                        {REMINDER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Notes</label>
                    <textarea
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Additional notes..."
                      rows={3}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none resize-none ${inputStyle}`}
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${cardBorder}`}>
                  <button
                    onClick={() => { resetForm(); setModalOpen(false); }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      dark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={addAppointment}
                    disabled={!newTitle.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Appointment
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
