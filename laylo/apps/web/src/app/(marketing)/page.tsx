'use client';

/**
 * Marketing landing — REDESIGN_BRIEF.md §2.10.
 * - "Life Admin AI" → "Laylo".
 * - Indigo→purple gradients → flat gold.
 * - "Get Started" → "Join the hive". "Sign In" → "Welcome back".
 */
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CreditCard,
  FileText,
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
  Wallet,
} from 'lucide-react';
import { BeeStanding } from '@/components/illustrations/bee';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
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
      className={`py-20 sm:py-24 ${className}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </motion.section>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-32">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] px-3 py-1.5 text-[13px] leading-[18px] font-medium text-[var(--color-text)] mb-6"
            >
              <Zap className="h-3.5 w-3.5 text-[var(--color-accent)]" strokeWidth={1.75} />
              Powered by AI
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-[48px] leading-[56px] font-bold tracking-tight text-[var(--color-text)]"
            >
              Your <span className="text-[var(--color-accent)]">bumblebee</span> for life&apos;s admin.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-6 text-[16px] leading-[22px] text-[var(--color-text-muted)] max-w-xl"
            >
              Track bills, subscriptions, reminders, appointments, and documents in one calm,
              intelligent workspace.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
              <Link
                href="#pricing"
                className="inline-flex items-center justify-center rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] px-7 h-12 text-[15px] font-semibold text-[var(--color-text-on-accent)] transition-colors"
              >
                Join the hive
              </Link>
              <a
                href="#preview"
                className="inline-flex items-center justify-center rounded-[16px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-7 h-12 text-[15px] font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                See How It Works
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="relative flex items-center justify-center"
          >
            <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg p-8 flex flex-col items-center gap-6">
              <BeeStanding size={128} />
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
                <span className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
                  Ask Laylo
                </span>
              </div>
              <p className="text-center text-[13px] leading-[18px] text-[var(--color-text-muted)] max-w-xs">
                &ldquo;What bills are due this week?&rdquo;<br />
                &ldquo;Worth keeping the gym membership?&rdquo;
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ProblemSolution() {
  const painPoints = [
    {
      icon: AlertTriangle,
      title: 'Missed bills & late fees',
      desc: 'Payments slip through the cracks when you juggle multiple due dates manually.',
    },
    {
      icon: FolderOpen,
      title: 'Scattered documents',
      desc: 'Insurance cards, tax forms, warranties — lost across emails, folders, and drawers.',
    },
    {
      icon: RotateCcw,
      title: 'Forgotten renewals',
      desc: 'Subscriptions auto-renew, insurance lapses, and deadlines sneak up on you.',
    },
  ];
  return (
    <Section className="bg-[var(--color-surface)]">
      <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-14">
        <h2 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">
          Life admin is <span className="text-[var(--color-danger)]">exhausting.</span>
        </h2>
        <p className="mt-4 text-[16px] leading-[22px] text-[var(--color-text-muted)]">
          The average person spends 3+ hours a week on life admin. Most of it is avoidable.
        </p>
      </motion.div>

      <motion.div variants={stagger} className="grid sm:grid-cols-3 gap-6 mb-16">
        {painPoints.map((point) => (
          <motion.div
            key={point.title}
            variants={fadeUp}
            className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-bg)] p-6 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--color-surface-2)] mb-4">
              <point.icon className="h-6 w-6 text-[var(--color-accent)]" strokeWidth={1.75} />
            </div>
            <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)] mb-2">{point.title}</h3>
            <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)]">{point.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} className="text-center">
        <p className="text-[22px] leading-[28px] font-semibold text-[var(--color-text)]">
          There&apos;s a better way.{' '}
          <span className="text-[var(--color-accent)]">Let Laylo handle the busywork.</span>
        </p>
      </motion.div>
    </Section>
  );
}

function Features() {
  const features = [
    { icon: LayoutDashboard, title: 'Smart Dashboard', desc: 'See everything at a glance — bills, tasks, appointments, and documents in one unified view.' },
    { icon: Wallet, title: 'Bill & Subscription Tracking', desc: 'Never miss a payment. Track due dates, amounts, and get smart alerts before deadlines.' },
    { icon: FileText, title: 'Document Vault', desc: 'Store and organise important files. Insurance, tax forms, warranties — always within reach.' },
    { icon: Sparkles, title: 'Ask Laylo', desc: 'Ask questions in natural language. Get instant answers and smart suggestions in context.' },
    { icon: Bell, title: 'Smart Reminders', desc: 'Get notified before deadlines, not after. Intelligent timing based on urgency and your preferences.' },
    { icon: CalendarDays, title: 'Appointment Manager', desc: 'Keep your calendar organised with upcoming appointments, follow-ups, and recurring events.' },
  ];
  return (
    <Section id="features">
      <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-14">
        <p className="text-[11px] leading-[14px] font-semibold text-[var(--color-accent)] uppercase tracking-wider mb-3">Features</p>
        <h2 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">
          Everything you need, nothing you don&apos;t.
        </h2>
        <p className="mt-4 text-[16px] leading-[22px] text-[var(--color-text-muted)]">
          A calm, focused workspace designed around how real life actually works.
        </p>
      </motion.div>

      <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => (
          <motion.div
            key={f.title}
            variants={fadeUp}
            className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 hover:border-[var(--color-border-strong)] hover:shadow-pop transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--color-surface-2)] mb-5">
              <f.icon className="h-5 w-5 text-[var(--color-accent)]" strokeWidth={1.75} />
            </div>
            <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)] mb-2">{f.title}</h3>
            <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)]">{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

function Trust() {
  const points = [
    { icon: Lock, title: 'End-to-end encryption', desc: 'Your data is encrypted in transit and at rest. Only you can access your information.' },
    { icon: Eye, title: 'No selling of data', desc: 'We will never sell, share, or monetise your personal data. Your life admin stays private.' },
    { icon: Shield, title: 'GDPR compliant', desc: 'Built with privacy-first principles. Full data portability and right to deletion.' },
  ];
  return (
    <Section>
      <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-14">
        <p className="text-[11px] leading-[14px] font-semibold text-[var(--color-accent)] uppercase tracking-wider mb-3">Privacy</p>
        <h2 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Your data is yours.</h2>
        <p className="mt-4 text-[16px] leading-[22px] text-[var(--color-text-muted)]">
          We take privacy seriously. Your life admin data deserves the highest level of protection.
        </p>
      </motion.div>

      <motion.div variants={stagger} className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {points.map((p) => (
          <motion.div
            key={p.title}
            variants={fadeUp}
            className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--color-surface-2)] mb-4">
              <p.icon className="h-6 w-6 text-[var(--color-accent)]" strokeWidth={1.75} />
            </div>
            <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)] mb-2">{p.title}</h3>
            <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)]">{p.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      desc: 'Perfect for getting started with life admin.',
      cta: 'Join the hive',
      featured: false,
      features: ['Up to 25 tasks', 'Up to 10 documents', 'Up to 10 bills tracked', 'Basic reminders', 'Limited Ask Laylo (20 messages/day)'],
    },
    {
      name: 'Premium',
      price: '$9.99',
      period: '/month',
      desc: 'Full power for your entire life admin.',
      cta: 'Upgrade to Premium',
      featured: true,
      badge: 'Most Popular',
      features: ['Unlimited tasks', 'Unlimited documents', 'Unlimited bill tracking', 'Full Ask Laylo (unlimited)', 'Smart summaries & insights', 'Advanced smart reminders', 'Priority support'],
    },
  ];
  return (
    <Section id="pricing" className="bg-[var(--color-surface)]">
      <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-14">
        <p className="text-[11px] leading-[14px] font-semibold text-[var(--color-accent)] uppercase tracking-wider mb-3">Pricing</p>
        <h2 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">
          Simple, transparent pricing.
        </h2>
        <p className="mt-4 text-[16px] leading-[22px] text-[var(--color-text-muted)]">
          Start free, upgrade when you need more. No surprises.
        </p>
      </motion.div>

      <motion.div variants={stagger} className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            variants={fadeUp}
            className={`relative rounded-[16px] border p-7 bg-[var(--color-bg)] ${
              plan.featured ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-6 inline-flex items-center rounded-[8px] px-3 py-1 text-[11px] leading-[14px] font-semibold uppercase tracking-wider bg-[var(--color-accent)] text-[var(--color-text-on-accent)]">
                {plan.badge}
              </span>
            )}
            <h3 className="text-[16px] leading-[22px] font-bold text-[var(--color-text)] mt-1">{plan.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-[32px] leading-[40px] font-bold text-[var(--color-text)] tabular-nums">{plan.price}</span>
              <span className="text-[13px] text-[var(--color-text-muted)]">{plan.period}</span>
            </div>
            <p className="mt-2 text-[13px] leading-[18px] text-[var(--color-text-muted)]">{plan.desc}</p>
            <ul className="mt-6 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[var(--color-accent)] mt-0.5 shrink-0" strokeWidth={1.75} />
                  <span className="text-[13px] leading-[18px] text-[var(--color-text)]">{f}</span>
                </li>
              ))}
            </ul>
            <button
              className={`mt-8 w-full rounded-[16px] px-5 h-12 text-[15px] font-semibold transition-colors ${
                plan.featured
                  ? 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-on-accent)]'
                  : 'border border-[var(--color-border-strong)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              {plan.cta}
            </button>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    { q: 'What is Laylo?', a: 'Laylo is an intelligent workspace that helps you manage everyday administrative tasks — bills, subscriptions, appointments, documents, and reminders — all in one place, powered by AI to save you time and reduce mental load.' },
    { q: 'Is my data secure?', a: 'Absolutely. All data is encrypted end-to-end, both in transit and at rest. We never sell or share your data with third parties. Your privacy is our top priority.' },
    { q: 'Can I use it on mobile?', a: 'Yes. Laylo is fully responsive and works beautifully on any device — phone, tablet, or desktop. A native mobile app is on our roadmap.' },
    { q: 'What AI powers Ask Laylo?', a: 'Ask Laylo is built on state-of-the-art large language models, fine-tuned for life admin tasks. It can understand your questions in natural language and provide smart, actionable answers.' },
    { q: 'Can I cancel anytime?', a: 'Of course. There are no contracts or commitments. You can upgrade, downgrade, or cancel your Premium subscription at any time. Your data is always exportable.' },
  ];
  return (
    <Section id="faq">
      <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-14">
        <p className="text-[11px] leading-[14px] font-semibold text-[var(--color-accent)] uppercase tracking-wider mb-3">FAQ</p>
        <h2 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Frequently asked questions</h2>
      </motion.div>

      <motion.div variants={stagger} className="max-w-2xl mx-auto space-y-3">
        {faqs.map((faq, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between px-6 py-5 text-left"
              aria-expanded={open === i}
            >
              <span className="text-[15px] leading-[22px] font-semibold text-[var(--color-text)] pr-4">{faq.q}</span>
              <motion.div animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
                <ChevronDown className="h-5 w-5 text-[var(--color-text-subtle)]" strokeWidth={1.75} />
              </motion.div>
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 text-[13px] leading-[18px] text-[var(--color-text-muted)]">{faq.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

function FinalCTA() {
  return (
    <section className="relative py-20 sm:py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger}
        className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center"
      >
        <motion.h2 variants={fadeUp} className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">
          Take control of your <span className="text-[var(--color-accent)]">life admin</span> today.
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-5 text-[16px] leading-[22px] text-[var(--color-text-muted)]">
          Join thousands of people who stopped drowning in admin and started living.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-8">
          <Link
            href="#pricing"
            className="inline-flex items-center justify-center rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] px-8 h-12 text-[15px] font-semibold text-[var(--color-text-on-accent)] transition-colors"
          >
            Join the hive
          </Link>
          <p className="mt-4 text-[13px] leading-[18px] text-[var(--color-text-subtle)]">
            Free forever. No credit card required.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default function MarketingPage() {
  return (
    <>
      <Hero />
      <ProblemSolution />
      <Features />
      <Trust />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </>
  );
}
