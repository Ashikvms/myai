'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Palette,
  Shield,
  Crown,
  Info,
  Check,
  User,
  Download,
  Trash2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------
function ToggleSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2 ${
        enabled ? 'bg-[#6366F1]' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section Card wrapper
// ---------------------------------------------------------------------------
function SectionCard({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: 'easeOut' }}
      className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-[#1A1A1A] dark:ring-white/10"
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------
function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6366F1]/10">
        <Icon className="h-5 w-5 text-[#6366F1]" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  // Profile
  const [name, setName] = useState('Alex Johnson');
  const [email, setEmail] = useState('alex.johnson@email.com');
  const profileDirty =
    name !== 'Alex Johnson' || email !== 'alex.johnson@email.com';

  // Notifications
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    reminder: true,
    bill: true,
    appointment: false,
    documentExpiry: true,
  });
  const [reminderDays, setReminderDays] = useState(3);

  const toggleNotification = useCallback(
    (key: keyof typeof notifications) => {
      setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [],
  );

  // Appearance
  const [darkMode, setDarkMode] = useState(false);
  const [themeColor, setThemeColor] = useState('indigo');

  const themeColors = [
    { name: 'indigo', value: '#6366F1' },
    { name: 'purple', value: '#8B5CF6' },
    { name: 'blue', value: '#3B82F6' },
    { name: 'green', value: '#22C55E' },
    { name: 'rose', value: '#F43F5E' },
  ];

  const handleDarkModeToggle = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // Notification toggle rows
  const notificationRows: { key: keyof typeof notifications; label: string }[] =
    [
      { key: 'email', label: 'Email notifications' },
      { key: 'push', label: 'Push notifications' },
      { key: 'reminder', label: 'Reminder notifications' },
      { key: 'bill', label: 'Bill reminders' },
      { key: 'appointment', label: 'Appointment reminders' },
      { key: 'documentExpiry', label: 'Document expiry alerts' },
    ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Page title */}
      <motion.h1
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl"
      >
        Settings
      </motion.h1>

      <div className="flex flex-col gap-6">
        {/* ----------------------------------------------------------------- */}
        {/* 1. Profile */}
        {/* ----------------------------------------------------------------- */}
        <SectionCard index={0}>
          <SectionHeading icon={User} title="Profile" />

          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-2xl font-bold text-white">
              AJ
            </div>

            <div className="w-full space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/30 dark:border-white/10 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/30 dark:border-white/10 dark:text-white"
                />
              </div>
              <button
                disabled={!profileDirty}
                onClick={() => alert('Profile saved!')}
                className={`rounded-lg px-5 py-2 text-sm font-medium text-white transition ${
                  profileDirty
                    ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-90'
                    : 'cursor-not-allowed bg-gray-300 dark:bg-gray-700'
                }`}
              >
                Save Changes
              </button>
            </div>
          </div>
        </SectionCard>

        {/* ----------------------------------------------------------------- */}
        {/* 2. Notifications */}
        {/* ----------------------------------------------------------------- */}
        <SectionCard index={1}>
          <SectionHeading icon={Bell} title="Notifications" />

          <div className="space-y-4">
            {notificationRows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {row.label}
                </span>
                <ToggleSwitch
                  enabled={notifications[row.key]}
                  onToggle={() => toggleNotification(row.key)}
                />
              </div>
            ))}

            {/* Reminder days */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Remind me{' '}
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={reminderDays}
                  onChange={(e) => {
                    const v = Math.min(30, Math.max(1, Number(e.target.value)));
                    setReminderDays(v);
                  }}
                  className="mx-1 inline-block w-14 rounded-md border border-gray-300 bg-transparent px-2 py-1 text-center text-sm text-gray-900 outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/30 dark:border-white/10 dark:text-white"
                />{' '}
                days before
              </span>
            </div>
          </div>
        </SectionCard>

        {/* ----------------------------------------------------------------- */}
        {/* 3. Appearance */}
        {/* ----------------------------------------------------------------- */}
        <SectionCard index={2}>
          <SectionHeading icon={Palette} title="Appearance" />

          <div className="space-y-5">
            {/* Dark mode */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Dark mode
              </span>
              <ToggleSwitch
                enabled={darkMode}
                onToggle={handleDarkModeToggle}
              />
            </div>

            {/* Theme color */}
            <div>
              <span className="mb-3 block text-sm text-gray-700 dark:text-gray-300">
                Theme color
              </span>
              <div className="flex items-center gap-3">
                {themeColors.map((c) => (
                  <button
                    key={c.name}
                    aria-label={`Select ${c.name} theme`}
                    onClick={() => setThemeColor(c.name)}
                    className="relative flex h-9 w-9 items-center justify-center rounded-full transition hover:scale-110"
                    style={{ backgroundColor: c.value }}
                  >
                    {themeColor === c.name && (
                      <Check className="h-4 w-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ----------------------------------------------------------------- */}
        {/* 4. Data & Privacy */}
        {/* ----------------------------------------------------------------- */}
        <SectionCard index={3}>
          <SectionHeading icon={Shield} title="Data & Privacy" />

          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  alert(
                    'Your data export has been requested. You will receive a download link via email shortly.',
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
              >
                <Download className="h-4 w-4" />
                Export My Data
              </button>
              <button
                onClick={() =>
                  alert(
                    'AI chat history has been cleared successfully.',
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Clear AI Chat History
              </button>
            </div>

            <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Your data is encrypted and stored securely. We never sell your
              personal information.
            </p>
          </div>
        </SectionCard>

        {/* ----------------------------------------------------------------- */}
        {/* 5. Subscription */}
        {/* ----------------------------------------------------------------- */}
        <SectionCard index={4}>
          <SectionHeading icon={Crown} title="Your Plan" />

          {/* Current plan badge */}
          <div className="mb-5">
            <span className="inline-block rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              Free
            </span>
          </div>

          {/* Comparison */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            {/* Free column */}
            <div className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                Free
              </h3>
              <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-1.5">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
                  25 tasks
                </li>
                <li className="flex items-start gap-1.5">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
                  10 documents
                </li>
                <li className="flex items-start gap-1.5">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
                  10 bills
                </li>
                <li className="flex items-start gap-1.5">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
                  Basic reminders
                </li>
                <li className="flex items-start gap-1.5">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
                  10 AI chats/day
                </li>
              </ul>
            </div>

            {/* Premium column */}
            <div className="rounded-xl border-2 border-[#6366F1]/40 bg-[#6366F1]/5 p-4 dark:bg-[#6366F1]/10">
              <h3 className="mb-3 text-sm font-semibold text-[#6366F1]">
                Premium
              </h3>
              <ul className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-1.5">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-[#6366F1]" />
                  Unlimited everything
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-[#6366F1]" />
                  Advanced AI
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-[#6366F1]" />
                  Smart summaries
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-[#6366F1]" />
                  Priority support
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => alert('Upgrade flow coming soon!')}
            className="w-full rounded-lg bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Upgrade to Premium &mdash; $9.99/mo
          </button>
          <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
            No credit card required to start
          </p>
        </SectionCard>

        {/* ----------------------------------------------------------------- */}
        {/* 6. About */}
        {/* ----------------------------------------------------------------- */}
        <SectionCard index={5}>
          <SectionHeading icon={Info} title="About" />

          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>App version</span>
              <span className="font-medium text-gray-900 dark:text-white">
                1.0.0
              </span>
            </div>
            <div className="flex justify-between">
              <span>Build</span>
              <span className="font-medium text-gray-900 dark:text-white">
                2026.03
              </span>
            </div>

            <hr className="border-gray-200 dark:border-white/10" />

            <div className="flex flex-col gap-2">
              <button className="inline-flex items-center gap-1.5 text-left text-sm text-[#6366F1] hover:underline">
                <ExternalLink className="h-3.5 w-3.5" />
                Terms of Service
              </button>
              <button className="inline-flex items-center gap-1.5 text-left text-sm text-[#6366F1] hover:underline">
                <ExternalLink className="h-3.5 w-3.5" />
                Privacy Policy
              </button>
              <button className="inline-flex items-center gap-1.5 text-left text-sm text-[#6366F1] hover:underline">
                <ExternalLink className="h-3.5 w-3.5" />
                Help Center
              </button>
            </div>

            <p className="pt-2 text-center text-xs text-gray-400 dark:text-gray-500">
              Made with ❤️ by Life Admin AI team
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
