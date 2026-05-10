'use client';

/**
 * Settings — Settings Hub Grid (LAYOUT_REDESIGN_BRIEF.md §2.10).
 * Hero Profile (full width) + 2x2 grid of section tiles (Notifications,
 * Appearance, Data & Privacy, Plan) + footer About row. Each section
 * card carries its own visual identity (icon in gold tile, generous
 * spacing) so the page feels intentional rather than a flat list.
 */
import { useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
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

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${
        enabled ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-2)]'
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

function SectionCard({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: [0.4, 0, 0.2, 1] }}
      className="rounded-[16px] bg-[var(--color-surface)] p-6 border border-[var(--color-border)]"
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--color-surface-2)]">
        <Icon className="h-5 w-5 text-[var(--color-accent)]" strokeWidth={1.75} />
      </div>
      <h2 className="text-[22px] leading-[28px] font-semibold text-[var(--color-text)]">{title}</h2>
    </div>
  );
}

const inputClass =
  'w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[15px] text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25';

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [name, setName] = useState('Alex Johnson');
  const [email, setEmail] = useState('alex.johnson@email.com');
  const profileDirty = name !== 'Alex Johnson' || email !== 'alex.johnson@email.com';

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    reminder: true,
    bill: true,
    appointment: false,
    documentExpiry: true,
  });
  const [reminderDays, setReminderDays] = useState(3);

  const toggleNotification = useCallback((key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const notificationRows: { key: keyof typeof notifications; label: string }[] = [
    { key: 'email', label: 'Email notifications' },
    { key: 'push', label: 'Push notifications' },
    { key: 'reminder', label: 'Reminder notifications' },
    { key: 'bill', label: 'Bill reminders' },
    { key: 'appointment', label: 'Appointment reminders' },
    { key: 'documentExpiry', label: 'Document expiry alerts' },
  ];

  return (
    <div className="mx-auto max-w-[1040px]">
      <header className="mb-8">
        <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Settings</h1>
        <p className="mt-2 text-[15px] leading-[22px] text-[var(--color-text-muted)]">
          Tune your hive. Profile up top, the rest sorted into rooms below.
        </p>
      </header>

      {/* Hero Profile — full width */}
      <SectionCard index={0}>
        <SectionHeading icon={User} title="Profile" />
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[28px] font-semibold text-[var(--color-text)]">
            AJ
          </div>
          <div className="w-full space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)]">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)]">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
            </div>
            <button
              disabled={!profileDirty}
              onClick={() => alert('Tucked away safely')}
              className={`px-4 h-10 rounded-[16px] text-[15px] font-medium transition ${
                profileDirty
                  ? 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-on-accent)]'
                  : 'cursor-not-allowed bg-[var(--color-surface-2)] text-[var(--color-text-subtle)]'
              }`}
            >
              Save changes
            </button>
          </div>
        </div>
      </SectionCard>

      {/* 2×2 hub grid — Notifications · Appearance · Data & Privacy · Plan */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Notifications */}
        <SectionCard index={1}>
          <SectionHeading icon={Bell} title="Notifications" />
          <div className="space-y-4">
            {notificationRows.map((row) => (
              <div key={row.key} className="flex items-center justify-between">
                <span className="text-[15px] leading-[22px] text-[var(--color-text)]">{row.label}</span>
                <ToggleSwitch enabled={notifications[row.key]} onToggle={() => toggleNotification(row.key)} />
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
              <span className="text-[15px] leading-[22px] text-[var(--color-text)]">
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
                  className="mx-1 inline-block w-14 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-center text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25"
                />{' '}
                days before
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Appearance */}
        <SectionCard index={2}>
          <SectionHeading icon={Palette} title="Appearance" />
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-[15px] leading-[22px] text-[var(--color-text)]">Dark mode</span>
              <ToggleSwitch enabled={isDark} onToggle={() => setTheme(isDark ? 'light' : 'dark')} />
            </div>
            <div className="rounded-[16px] bg-[var(--color-surface-2)] p-4">
              <p className="text-[15px] leading-[22px] font-medium text-[var(--color-text)]">Brand accent</p>
              <p className="mt-1 text-[13px] leading-[18px] text-[var(--color-text-muted)]">
                Bumblebee gold. The only sanctioned accent.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent)]">
                  <Check className="h-4 w-4 text-[var(--color-text-on-accent)]" strokeWidth={3} />
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Data & Privacy */}
        <SectionCard index={3}>
          <SectionHeading icon={Shield} title="Data & Privacy" />
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <button
                onClick={() => alert('Your data export has been requested. You will receive a download link via email shortly.')}
                className="inline-flex items-center justify-between gap-2 rounded-[16px] border border-[var(--color-border-strong)] px-4 h-11 text-[15px] font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
              >
                <span className="flex items-center gap-2">
                  <Download className="h-4 w-4" strokeWidth={1.75} />
                  Export my data
                </span>
                <ChevronRight className="h-4 w-4 text-[var(--color-text-subtle)]" strokeWidth={1.75} />
              </button>
              <button
                onClick={() => alert('AI chat history has been cleared successfully.')}
                className="inline-flex items-center justify-between gap-2 rounded-[16px] border border-[var(--color-danger)]/40 px-4 h-11 text-[15px] font-medium text-[var(--color-danger)] transition hover:bg-[var(--color-surface-hover)]"
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  Clear AI chat history
                </span>
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)]">
              Your data is encrypted and stored securely. We never sell your personal information.
            </p>
          </div>
        </SectionCard>

        {/* Subscription */}
        <SectionCard index={4}>
          <SectionHeading icon={Crown} title="Your plan" />
          <div className="mb-5 flex items-center justify-between">
            <span className="inline-block rounded-[8px] bg-[var(--color-surface-2)] px-3 py-1 text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Free
            </span>
            <span className="text-[13px] leading-[18px] text-[var(--color-text-muted)]">25 tasks · 10 docs · 10 bills</span>
          </div>
          <div className="rounded-[16px] border-2 border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] p-4 mb-4">
            <h3 className="mb-2 text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">Premium — $9.99/mo</h3>
            <ul className="space-y-1.5 text-[13px] leading-[18px] text-[var(--color-text)]">
              {['Unlimited everything', 'Advanced AI summaries', 'Priority support'].map((f) => (
                <li key={f} className="flex items-start gap-1.5">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-[var(--color-accent)]" strokeWidth={2} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => alert('Upgrade flow coming soon!')}
            className="w-full rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] py-3 text-[15px] font-semibold text-[var(--color-text-on-accent)] transition"
          >
            Upgrade to Premium
          </button>
        </SectionCard>
      </div>

      {/* About — footer row */}
      <div className="mt-6">
        <SectionCard index={5}>
          <SectionHeading icon={Info} title="About" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 text-[15px] leading-[22px] text-[var(--color-text-muted)]">
              <div className="flex justify-between">
                <span>App version</span>
                <span className="font-medium text-[var(--color-text)]">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Build</span>
                <span className="font-medium text-[var(--color-text)]">2026.04</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {['Terms of Service', 'Privacy Policy', 'Help Center'].map((label) => (
                <button key={label} className="inline-flex items-center gap-1.5 text-left text-[13px] leading-[18px] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-4 text-center text-[12px] leading-[16px] text-[var(--color-text-subtle)]">
            Made with care by the Laylo team. 🐝
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
