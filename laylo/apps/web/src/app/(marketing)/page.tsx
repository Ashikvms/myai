'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  MessageSquare,
  Bell,
  CalendarDays,
  Shield,
  Lock,
  Eye,
  Check,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  FolderOpen,
  RotateCcw,
  Zap,
  Bot,
  Send,
} from 'lucide-react';

/* ─── animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={stagger}
      className={`py-20 sm:py-28 ${className}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </motion.section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   HERO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-primary-200 dark:border-primary-500/30 bg-primary-50 dark:bg-primary-500/10 px-4 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 mb-6">
              <Zap className="h-3.5 w-3.5" />
              Powered by AI
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.1]"
            >
              Your AI assistant for{' '}
              <span className="gradient-text">life&apos;s admin.</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-6 text-lg sm:text-xl text-gray-500 dark:text-gray-400 leading-relaxed max-w-xl"
            >
              Track bills, subscriptions, reminders, appointments, and documents
              in one calm, intelligent workspace.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
              <Link
                href="#pricing"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary-500 to-purple-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:brightness-110 transition-all"
              >
                Get Started Free
              </Link>
              <a
                href="#preview"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-card-dark px-7 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:border-primary-300 dark:hover:border-primary-500/50 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
              >
                See How It Works
              </a>
            </motion.div>
          </motion.div>

          {/* Hero mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            className="relative"
          >
            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700/50 bg-white dark:bg-card-dark shadow-2xl shadow-gray-200/50 dark:shadow-black/30 overflow-hidden">
              {/* Title bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <span className="ml-2 text-xs font-medium text-gray-400 dark:text-gray-500">Life Admin AI — Dashboard</span>
              </div>
              {/* Dashboard content */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Due Soon', value: '3', color: 'text-amber-500' },
                    { label: 'Tracked', value: '12', color: 'text-primary-500' },
                    { label: 'Saved', value: '$247', color: 'text-emerald-500' },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 text-center">
                      <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
                {/* Task cards */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20">
                      <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">Electric Bill</p>
                      <p className="text-xs text-gray-400">Due Mar 20 &middot; $142.50</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">5 days</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-500/20">
                      <CalendarDays className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">Dentist Appointment</p>
                      <p className="text-xs text-gray-400">Mar 22 &middot; 10:00 AM</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary-100 dark:bg-primary-500/20 px-2.5 py-0.5 text-[11px] font-medium text-primary-700 dark:text-primary-400">7 days</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                      <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">Car Insurance Renewal</p>
                      <p className="text-xs text-gray-400">Expires Apr 15 &middot; Document saved</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">31 days</span>
                  </div>
                </div>
                {/* AI chat bubble */}
                <div className="rounded-xl bg-gradient-to-r from-primary-500/10 to-purple-500/10 dark:from-primary-500/20 dark:to-purple-500/20 border border-primary-200/50 dark:border-primary-500/20 p-3 flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-purple-500">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary-700 dark:text-primary-300">AI Assistant</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">You have 3 bills due this week totaling $287.50. Want me to set up reminders?</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative glow */}
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary-500/20 to-purple-500/20 blur-2xl -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PROBLEM / SOLUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function ProblemSolution() {
  const painPoints = [
    {
      icon: AlertTriangle,
      title: 'Missed bills & late fees',
      desc: 'Payments slip through the cracks when you juggle multiple due dates manually.',
      color: 'text-red-500',
      bg: 'bg-red-100 dark:bg-red-500/20',
    },
    {
      icon: FolderOpen,
      title: 'Scattered documents',
      desc: 'Insurance cards, tax forms, warranties — lost across emails, folders, and drawers.',
      color: 'text-amber-500',
      bg: 'bg-amber-100 dark:bg-amber-500/20',
    },
    {
      icon: RotateCcw,
      title: 'Forgotten renewals',
      desc: 'Subscriptions auto-renew, insurance lapses, and deadlines sneak up on you.',
      color: 'text-orange-500',
      bg: 'bg-orange-100 dark:bg-orange-500/20',
    },
  ];

  return (
    <Section className="bg-white dark:bg-card-dark">
      <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-14">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          Life admin is <span className="text-red-400">exhausting.</span>
        </h2>
        <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
          The average person spends 3+ hours a week on life admin. Most of it is avoidable.
        </p>
      </motion.div>

      <motion.div variants={stagger} className="grid sm:grid-cols-3 gap-6 mb-16">
        {painPoints.map((point) => (
          <motion.div
            key={point.title}
            variants={fadeUp}
            className="rounded-2xl border border-gray-200/80 dark:border-gray-700/50 bg-surface-light dark:bg-surface-dark p-6 text-center"
          >
            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl ${point.bg} mb-4`}>
              <point.icon className={`h-6 w-6 ${point.color}`} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{point.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{point.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} className="text-center">
        <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
          There&apos;s a better way.{' '}
          <span className="gradient-text">Let AI handle the busywork.</span>
        </p>
      </motion.div>
    </Section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Features() {
  const features = [
    {
      icon: LayoutDashboard,
      title: 'Smart Dashboard',
      desc: 'See everything at a glance — bills, tasks, appointments, and documents in one unified view.',
    },
    {
      icon: CreditCard,
      title: 'Bill & Subscription Tracking',
      desc: 'Never miss a payment again. Track due dates, amounts, and get smart alerts before deadlines.',
    },
    {
      icon: FileText,
      title: 'Document Vault',
      desc: 'Store and organize important files securely. Insurance, tax forms, warranties — always within reach.',
    },
    {
      icon: MessageSquare,
      title: 'AI Assistant',
      desc: 'Ask questions about your life admin in natural language. Get instant answers and smart suggestions.',
    },
    {
      icon: Bell,
      title: 'Smart Reminders',
      desc: 'Get notified before deadlines, not after. Intelligent timing based on urgency and your preferences.',
    },
    {
      icon: CalendarDays,
      title: 'Appointment Manager',
      desc: 'Keep your calendar organized with upcoming appointments, follow-ups, and recurring events.',
    },
  ];

  return (
    <Section id="features">
      <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-14">
        <p className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-3">Features</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          Everything you need, nothing you don&apos;t.
        </h2>
        <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
          A calm, focused workspace designed around how real life actually works.
        </p>
      </motion.div>

      <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => (
          <motion.div
            key={f.title}
            variants={fadeUp}
            className="group rounded-2xl border border-gray-200/80 dark:border-gray-700/50 bg-white dark:bg-card-dark p-6 hover:border-primary-300 dark:hover:border-primary-500/40 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 shadow-md shadow-primary-500/20 group-hover:shadow-lg group-hover:shadow-primary-500/30 transition-shadow mb-5">
              <f.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   APP PREVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function AppPreview() {
  return (
    <Section id="preview" className="bg-white dark:bg-card-dark">
      <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-14">
        <p className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-3">Preview</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          See it in action
        </h2>
        <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
          Three views, one workspace. Everything connects seamlessly.
        </p>
      </motion.div>

      <motion.div variants={stagger} className="grid md:grid-cols-3 gap-6">
        {/* Dashboard Screen */}
        <motion.div variants={fadeUp} className="rounded-2xl border border-gray-200/80 dark:border-gray-700/50 bg-surface-light dark:bg-surface-dark overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200/80 dark:border-gray-700/50 flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-primary-500" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Dashboard</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white dark:bg-card-dark p-3 text-center">
                <p className="text-lg font-bold text-primary-500">8</p>
                <p className="text-[10px] text-gray-400">Active Tasks</p>
              </div>
              <div className="rounded-lg bg-white dark:bg-card-dark p-3 text-center">
                <p className="text-lg font-bold text-emerald-500">$1,240</p>
                <p className="text-[10px] text-gray-400">This Month</p>
              </div>
            </div>
            {['Renew passport', 'Pay water bill', 'File tax return'].map((t) => (
              <div key={t} className="flex items-center gap-2 rounded-lg bg-white dark:bg-card-dark p-2.5">
                <div className="h-4 w-4 rounded border-2 border-gray-300 dark:border-gray-600 shrink-0" />
                <span className="text-xs text-gray-700 dark:text-gray-300">{t}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* AI Chat Screen */}
        <motion.div variants={fadeUp} className="rounded-2xl border border-gray-200/80 dark:border-gray-700/50 bg-surface-light dark:bg-surface-dark overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200/80 dark:border-gray-700/50 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary-500" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">AI Assistant</span>
          </div>
          <div className="p-4 space-y-3">
            {/* User message */}
            <div className="flex justify-end">
              <div className="rounded-xl rounded-br-sm bg-primary-500 px-3 py-2 max-w-[85%]">
                <p className="text-xs text-white">What bills are due this week?</p>
              </div>
            </div>
            {/* AI reply */}
            <div className="flex justify-start">
              <div className="rounded-xl rounded-bl-sm bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 px-3 py-2 max-w-[85%]">
                <p className="text-xs text-gray-700 dark:text-gray-300">You have 2 bills due this week:</p>
                <ul className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                  <li>&bull; Electric — $142.50 (Mar 20)</li>
                  <li>&bull; Internet — $79.99 (Mar 22)</li>
                </ul>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total: $222.49</p>
              </div>
            </div>
            {/* User message */}
            <div className="flex justify-end">
              <div className="rounded-xl rounded-br-sm bg-primary-500 px-3 py-2 max-w-[85%]">
                <p className="text-xs text-white">Remind me the day before</p>
              </div>
            </div>
            {/* AI reply */}
            <div className="flex justify-start">
              <div className="rounded-xl rounded-bl-sm bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 px-3 py-2 max-w-[85%]">
                <p className="text-xs text-gray-700 dark:text-gray-300">Done! I&apos;ve set reminders for Mar 19 and Mar 21.</p>
              </div>
            </div>
            {/* Input bar */}
            <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 px-3 py-2">
              <span className="text-xs text-gray-400 flex-1">Ask anything...</span>
              <Send className="h-3.5 w-3.5 text-primary-500" />
            </div>
          </div>
        </motion.div>

        {/* Bills Screen */}
        <motion.div variants={fadeUp} className="rounded-2xl border border-gray-200/80 dark:border-gray-700/50 bg-surface-light dark:bg-surface-dark overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200/80 dark:border-gray-700/50 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary-500" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Bills & Subscriptions</span>
          </div>
          <div className="p-4 space-y-3">
            {[
              { name: 'Netflix', amount: '$15.99', status: 'Paid', statusColor: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-500/20' },
              { name: 'Electric Bill', amount: '$142.50', status: 'Due Soon', statusColor: 'text-amber-600 bg-amber-100 dark:bg-amber-500/20' },
              { name: 'Car Insurance', amount: '$189.00', status: 'Upcoming', statusColor: 'text-primary-600 bg-primary-100 dark:bg-primary-500/20' },
              { name: 'Spotify', amount: '$9.99', status: 'Paid', statusColor: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-500/20' },
              { name: 'Internet', amount: '$79.99', status: 'Due Soon', statusColor: 'text-amber-600 bg-amber-100 dark:bg-amber-500/20' },
            ].map((bill) => (
              <div key={bill.name} className="flex items-center justify-between rounded-lg bg-white dark:bg-card-dark p-2.5">
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{bill.name}</p>
                  <p className="text-[10px] text-gray-400">{bill.amount}/mo</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${bill.statusColor}`}>{bill.status}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </Section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TRUST / PRIVACY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Trust() {
  const points = [
    {
      icon: Lock,
      title: 'End-to-end encryption',
      desc: 'Your data is encrypted in transit and at rest. Only you can access your information.',
    },
    {
      icon: Eye,
      title: 'No selling of data',
      desc: 'We will never sell, share, or monetize your personal data. Your life admin stays private.',
    },
    {
      icon: Shield,
      title: 'GDPR compliant',
      desc: 'Built with privacy-first principles. Full data portability and right to deletion.',
    },
  ];

  return (
    <Section>
      <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-14">
        <p className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-3">Privacy</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          Your data is yours.
        </h2>
        <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
          We take privacy seriously. Your life admin data deserves the highest level of protection.
        </p>
      </motion.div>

      <motion.div variants={stagger} className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {points.map((p) => (
          <motion.div
            key={p.title}
            variants={fadeUp}
            className="rounded-2xl border border-gray-200/80 dark:border-gray-700/50 bg-white dark:bg-card-dark p-6 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/20 mb-4">
              <p.icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{p.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{p.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PRICING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      desc: 'Perfect for getting started with life admin.',
      cta: 'Get Started Free',
      ctaStyle: 'border border-gray-300 dark:border-gray-700 bg-white dark:bg-card-dark text-gray-700 dark:text-gray-200 hover:border-primary-300 dark:hover:border-primary-500/50',
      badge: 'No credit card required',
      featured: false,
      features: [
        'Up to 25 tasks',
        'Up to 10 documents',
        'Up to 10 bills tracked',
        'Basic reminders',
        'Limited AI chat (20 messages/day)',
      ],
    },
    {
      name: 'Premium',
      price: '$9.99',
      period: '/month',
      desc: 'Full power for your entire life admin.',
      cta: 'Upgrade to Premium',
      ctaStyle: 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:brightness-110',
      badge: 'Most Popular',
      featured: true,
      features: [
        'Unlimited tasks',
        'Unlimited documents',
        'Unlimited bill tracking',
        'Full AI assistant (unlimited)',
        'Smart summaries & insights',
        'Advanced smart reminders',
        'Priority support',
      ],
    },
  ];

  return (
    <Section id="pricing" className="bg-white dark:bg-card-dark">
      <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-14">
        <p className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-3">Pricing</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          Simple, transparent pricing.
        </h2>
        <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
          Start free, upgrade when you need more. No surprises.
        </p>
      </motion.div>

      <motion.div variants={stagger} className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            variants={fadeUp}
            className={`relative rounded-2xl border p-7 ${
              plan.featured
                ? 'border-primary-300 dark:border-primary-500/40 bg-surface-light dark:bg-surface-dark shadow-xl shadow-primary-500/10'
                : 'border-gray-200/80 dark:border-gray-700/50 bg-surface-light dark:bg-surface-dark'
            }`}
          >
            {plan.badge && (
              <span
                className={`absolute -top-3 left-6 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  plan.featured
                    ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-md shadow-primary-500/25'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {plan.badge}
              </span>
            )}
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">{plan.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{plan.price}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{plan.period}</span>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{plan.desc}</p>
            <ul className="mt-6 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{f}</span>
                </li>
              ))}
            </ul>
            <button className={`mt-8 w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all ${plan.ctaStyle}`}>
              {plan.cta}
            </button>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FAQ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  const faqs = [
    {
      q: 'What is Life Admin AI?',
      a: 'Life Admin AI is an intelligent workspace that helps you manage everyday administrative tasks — bills, subscriptions, appointments, documents, and reminders — all in one place, powered by AI to save you time and reduce mental load.',
    },
    {
      q: 'Is my data secure?',
      a: 'Absolutely. All data is encrypted end-to-end, both in transit and at rest. We never sell or share your data with third parties. Your privacy is our top priority.',
    },
    {
      q: 'Can I use it on mobile?',
      a: 'Yes! Life Admin AI is fully responsive and works beautifully on any device — phone, tablet, or desktop. A native mobile app is on our roadmap.',
    },
    {
      q: 'What AI powers the assistant?',
      a: 'Our AI assistant is built on state-of-the-art large language models, fine-tuned for life admin tasks. It can understand your questions in natural language and provide smart, actionable answers about your bills, deadlines, and more.',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Of course. There are no contracts or commitments. You can upgrade, downgrade, or cancel your Premium subscription at any time. Your data is always exportable.',
    },
  ];

  return (
    <Section id="faq">
      <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-14">
        <p className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-3">FAQ</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          Frequently asked questions
        </h2>
      </motion.div>

      <motion.div variants={stagger} className="max-w-2xl mx-auto space-y-3">
        {faqs.map((faq, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            className="rounded-2xl border border-gray-200/80 dark:border-gray-700/50 bg-white dark:bg-card-dark overflow-hidden"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between px-6 py-5 text-left"
            >
              <span className="text-sm font-semibold text-gray-900 dark:text-white pr-4">{faq.q}</span>
              <motion.div
                animate={{ rotate: open === i ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0"
              >
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </motion.div>
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {faq.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FINAL CTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function FinalCTA() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-purple-500/5 to-primary-500/5 dark:from-primary-500/10 dark:via-purple-500/10 dark:to-primary-500/10" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary-500/10 blur-3xl" />
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center"
      >
        <motion.h2
          variants={fadeUp}
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight"
        >
          Take control of your{' '}
          <span className="gradient-text">life admin</span> today.
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-5 text-lg text-gray-500 dark:text-gray-400">
          Join thousands of people who stopped drowning in admin and started living.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-8">
          <Link
            href="#pricing"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary-500 to-purple-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:brightness-110 transition-all"
          >
            Get Started Free
          </Link>
          <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
            Free forever. No credit card required.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function MarketingPage() {
  return (
    <>
      <Hero />
      <ProblemSolution />
      <Features />
      <AppPreview />
      <Trust />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </>
  );
}
