'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Plus,
  X,
  CheckCircle,
  Trash2,
  Inbox,
  Clock,
  RefreshCw,
  FileText,
  CalendarDays,
  CreditCard,
  Car,
  Shield,
  Repeat,
} from 'lucide-react';
import { format, addDays, addMonths } from 'date-fns';

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

// ─── Linked Type Config ──────────────────────────────────────────────────────

const LINKED_TYPE_CONFIG: Record<LinkedType, {
  gradient: string;
  bg: string;
  darkBg: string;
  text: string;
  darkText: string;
  icon: React.ElementType;
}> = {
  Document: {
    gradient: 'from-indigo-500 to-indigo-600',
    bg: 'bg-indigo-50',
    darkBg: 'bg-indigo-900/30',
    text: 'text-indigo-700',
    darkText: 'text-indigo-400',
    icon: FileText,
  },
  Appointment: {
    gradient: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50',
    darkBg: 'bg-purple-900/30',
    text: 'text-purple-700',
    darkText: 'text-purple-400',
    icon: CalendarDays,
  },
  Bill: {
    gradient: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50',
    darkBg: 'bg-amber-900/30',
    text: 'text-amber-700',
    darkText: 'text-amber-400',
    icon: CreditCard,
  },
  Subscription: {
    gradient: 'from-pink-500 to-pink-600',
    bg: 'bg-pink-50',
    darkBg: 'bg-pink-900/30',
    text: 'text-pink-700',
    darkText: 'text-pink-400',
    icon: RefreshCw,
  },
  Task: {
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-50',
    darkBg: 'bg-green-900/30',
    text: 'text-green-700',
    darkText: 'text-green-400',
    icon: CheckCircle,
  },
  None: {
    gradient: 'from-gray-500 to-gray-600',
    bg: 'bg-gray-50',
    darkBg: 'bg-gray-900/30',
    text: 'text-gray-700',
    darkText: 'text-gray-400',
    icon: Bell,
  },
};

const ALL_LINKED_TYPES: LinkedType[] = ['Document', 'Appointment', 'Bill', 'Subscription', 'Task', 'None'];

// ─── Demo Data ───────────────────────────────────────────────────────────────

const today = new Date();

function setTime(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

const INITIAL_REMINDERS: Reminder[] = [
  {
    id: 'r1',
    title: 'Renew vehicle registration',
    dateTime: setTime(addDays(today, 60), 9, 0),
    linkedType: 'Document',
    recurring: true,
    recurrenceRule: 'Annually',
    status: 'pending',
  },
  {
    id: 'r2',
    title: 'Pay electricity bill',
    dateTime: setTime(addDays(today, 1), 10, 0),
    linkedType: 'Bill',
    recurring: false,
    status: 'pending',
  },
  {
    id: 'r3',
    title: 'Passport renewal deadline',
    dateTime: setTime(addMonths(today, 5), 9, 0),
    linkedType: 'Document',
    recurring: false,
    status: 'pending',
  },
  {
    id: 'r4',
    title: 'Dentist appointment tomorrow',
    dateTime: setTime(addDays(today, 1), 8, 0),
    linkedType: 'Appointment',
    recurring: false,
    status: 'pending',
  },
  {
    id: 'r5',
    title: 'Review gym membership',
    dateTime: setTime(addDays(today, 2), 12, 0),
    linkedType: 'Subscription',
    recurring: false,
    status: 'pending',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Pending');
  const [modalOpen, setModalOpen] = useState(false);

  // New reminder form state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(format(addDays(today, 1), 'yyyy-MM-dd'));
  const [newTime, setNewTime] = useState('09:00');
  const [newLinkedType, setNewLinkedType] = useState<LinkedType>('None');
  const [newRecurring, setNewRecurring] = useState(false);
  const [newRecurrenceRule, setNewRecurrenceRule] = useState('Monthly');

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

  // Filtered and sorted reminders
  const filteredReminders = useMemo(() => {
    let filtered = reminders;
    if (activeFilter === 'Pending') {
      filtered = reminders.filter((r) => r.status === 'pending');
    } else if (activeFilter === 'Dismissed') {
      filtered = reminders.filter((r) => r.status === 'dismissed');
    }
    return [...filtered].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  }, [reminders, activeFilter]);

  const pendingCount = useMemo(() => reminders.filter((r) => r.status === 'pending').length, [reminders]);
  const dismissedCount = useMemo(() => reminders.filter((r) => r.status === 'dismissed').length, [reminders]);

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
  const dismissReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'dismissed' as ReminderStatus } : r))
    );
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
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <h1 className={`text-3xl font-bold ${textPrimary}`}>Reminders</h1>
              </div>
              <p className={`text-sm ${textSecondary} ml-[52px]`}>
                {pendingCount} pending reminder{pendingCount !== 1 ? 's' : ''}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
            >
              <Plus className="w-4 h-4" />
              Add Reminder
            </motion.button>
          </div>
        </motion.div>

        {/* ── Filter Tabs ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2">
            {(['Pending', 'Dismissed', 'All'] as FilterTab[]).map((tab) => {
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
                    {filterCounts[tab]}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Empty State ─────────────────────────────────────────────── */}
        {filteredReminders.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className={`rounded-2xl border ${cardBorder} ${cardBg} p-12 text-center`}
          >
            <div className={`inline-flex p-4 rounded-2xl mb-4 ${dark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <Inbox className={`w-10 h-10 ${textMuted}`} />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>
              {activeFilter === 'All'
                ? 'No reminders yet'
                : activeFilter === 'Pending'
                ? 'No pending reminders'
                : 'No dismissed reminders'}
            </h3>
            <p className={`text-sm mb-6 ${textSecondary}`}>
              {activeFilter === 'Pending'
                ? 'You\'re all caught up! No pending reminders.'
                : activeFilter === 'Dismissed'
                ? 'No dismissed reminders to show.'
                : 'Create your first reminder to never miss anything important.'}
            </p>
            {activeFilter !== 'Dismissed' && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25"
              >
                <Plus className="w-4 h-4" />
                Add Reminder
              </motion.button>
            )}
          </motion.div>
        )}

        {/* ── Reminder Cards ──────────────────────────────────────────── */}
        {filteredReminders.length > 0 && (
          <motion.div layout className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredReminders.map((reminder, index) => {
                const config = LINKED_TYPE_CONFIG[reminder.linkedType];
                const isPending = reminder.status === 'pending';
                const IconComponent = config.icon;

                return (
                  <motion.div
                    key={reminder.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.35, delay: index * 0.06 }}
                    className={`group rounded-2xl border ${cardBorder} ${cardBg} p-5 transition-all hover:shadow-lg ${
                      dark ? 'hover:border-white/10' : 'hover:border-gray-200 hover:shadow-gray-200/50'
                    } ${!isPending ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${config.gradient} shadow-lg flex-shrink-0`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-base font-semibold mb-1 ${textPrimary} ${
                          !isPending ? 'line-through' : ''
                        }`}>
                          {reminder.title}
                        </h3>

                        {/* Date/Time */}
                        <p className={`text-sm flex items-center gap-1.5 mb-3 ${
                          dark ? 'text-indigo-400' : 'text-indigo-600'
                        } font-medium`}>
                          <Clock className="w-3.5 h-3.5" />
                          {format(reminder.dateTime, 'EEE, MMM d, yyyy \u2014 h:mm a')}
                        </p>

                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Recurring badge */}
                          {reminder.recurring && (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                                dark ? 'bg-teal-900/30 text-teal-400' : 'bg-teal-50 text-teal-700'
                              }`}
                            >
                              <Repeat className="w-3 h-3" />
                              {reminder.recurrenceRule}
                            </span>
                          )}

                          {/* Linked type badge */}
                          {reminder.linkedType !== 'None' && (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                                dark ? `${config.darkBg} ${config.darkText}` : `${config.bg} ${config.text}`
                              }`}
                            >
                              <IconComponent className="w-3 h-3" />
                              {reminder.linkedType}
                            </span>
                          )}

                          {/* Status badge */}
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                              isPending
                                ? dark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-700'
                                : dark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'
                            }`}
                          >
                            {isPending ? 'Pending' : 'Dismissed'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isPending && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => dismissReminder(reminder.id)}
                            className={`p-2 rounded-xl transition-colors ${
                              dark
                                ? 'text-green-400 hover:bg-green-900/30'
                                : 'text-green-500 hover:bg-green-50'
                            }`}
                            title="Dismiss"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </motion.button>
                        )}
                        <button
                          onClick={() => deleteReminder(reminder.id)}
                          className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${
                            dark
                              ? 'hover:bg-red-900/30 text-gray-400 hover:text-red-400'
                              : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                          }`}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── Add Reminder Modal ─────────────────────────────────────────── */}
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
                  <h2 className={`text-lg font-semibold ${textPrimary}`}>Add Reminder</h2>
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
                      placeholder="What should you be reminded about?"
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none ${inputStyle}`}
                    />
                  </div>

                  {/* Date + Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Date</label>
                      <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Time</label>
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none ${inputStyle}`}
                      />
                    </div>
                  </div>

                  {/* Linked Type */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Linked To</label>
                    <select
                      value={newLinkedType}
                      onChange={(e) => setNewLinkedType(e.target.value as LinkedType)}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none appearance-none cursor-pointer ${inputStyle}`}
                    >
                      {ALL_LINKED_TYPES.map((t) => (
                        <option key={t} value={t}>{t === 'None' ? 'None' : t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Recurring Toggle */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className={`text-sm font-medium ${textPrimary}`}>Recurring</label>
                      <button
                        type="button"
                        onClick={() => setNewRecurring(!newRecurring)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          newRecurring
                            ? 'bg-gradient-to-r from-indigo-500 to-indigo-600'
                            : dark ? 'bg-white/10' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            newRecurring ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Recurrence Rule */}
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
                            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                              Recurrence
                            </label>
                            <select
                              value={newRecurrenceRule}
                              onChange={(e) => setNewRecurrenceRule(e.target.value)}
                              className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none appearance-none cursor-pointer ${inputStyle}`}
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
                    onClick={addReminder}
                    disabled={!newTitle.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Reminder
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
