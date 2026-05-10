'use client';

/**
 * Dashboard — REDESIGN_BRIEF.md §2.1 + DESIGN_SYSTEM.md §10.1.
 * - viewState toolbar removed.
 * - DOM-class theme toggle removed; theme handled by next-themes globally.
 * - Hero "Ask Laylo" input is the single primary gold surface.
 * - 3 stat cards, single accent on the most actionable.
 */
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CheckSquare,
  CreditCard,
  DollarSign,
  Calendar,
  Sparkles,
  AlertTriangle,
  Clock,
  TrendingUp,
  Shield,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  ConnectedAccountsCard,
  RecentTransactionsCard,
} from '@/components/banking/dashboard-widgets';
import { AskLayloHero, AskAiChip } from '@/components/ai/ask-ai';
import { BeeStanding } from '@/components/illustrations/bee';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { ListStagger, ListItem } from '@/components/motion/list-stagger';

// ─── Demo Data ───────────────────────────────────────────────────────
const DEMO_TASKS = [
  { id: '1', title: 'Renew car insurance policy', priority: 'high' as const, category: 'Insurance', dueDate: '2026-05-17', completed: false },
  { id: '2', title: 'Schedule annual dental checkup', priority: 'medium' as const, category: 'Health', dueDate: '2026-05-20', completed: false },
  { id: '3', title: 'File quarterly tax documents', priority: 'high' as const, category: 'Finance', dueDate: '2026-05-15', completed: true },
];

const DEMO_BILLS = [
  { id: '1', name: 'Electric Bill', amount: 142.5, dueDate: '2026-05-04', autopay: false },
  { id: '2', name: 'Internet Service', amount: 79.99, dueDate: '2026-05-06', autopay: true },
];

const DEMO_INSIGHTS = [
  { id: '1', message: 'Gym membership renews in 3 days — still worth it?', icon: AlertTriangle, label: 'Review', prompt: 'Worth keeping?' },
  { id: '2', message: 'Monthly subscriptions total $78.47 — up 12% from last month', icon: TrendingUp, label: 'Insight', prompt: 'Why did this go up?' },
  { id: '3', message: 'Your car insurance policy expires in 2 months', icon: Shield, label: 'Action', prompt: 'When does this expire?' },
];

// ─── Greeting ────────────────────────────────────────────────────────
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Stat Card ───────────────────────────────────────────────────────
function StatCard({
  label,
  numericValue,
  prefix,
  suffix,
  decimals,
  icon: Icon,
  accent,
}: {
  label: string;
  numericValue: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon: React.ElementType;
  accent?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -2, rotate: 1.2, scale: 1.01 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="relative rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 hover:shadow-pop transition-shadow overflow-hidden"
    >
      {accent && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-4"
          style={{
            background:
              'radial-gradient(circle at center, rgba(255,215,0,0.18) 0%, rgba(255,215,0,0) 65%)',
          }}
        />
      )}
      <div className="relative flex items-center gap-3">
        <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-[var(--color-text-muted)]" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">{label}</p>
          <p
            className={`text-[22px] leading-[28px] font-semibold mt-1 tabular-nums ${
              accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'
            }`}
          >
            <AnimatedNumber
              value={numericValue}
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
            />
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section Title ───────────────────────────────────────────────────
function SectionTitle({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-[var(--color-text-muted)]" strokeWidth={1.75} />
      <h2 className="text-[22px] leading-[28px] font-semibold text-[var(--color-text)]">{title}</h2>
      {typeof count === 'number' && (
        <span className="text-[13px] leading-[18px] font-medium px-2 py-0.5 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const [taskChecked, setTaskChecked] = useState<Record<string, boolean>>({ '3': true });
  const reduce = useReducedMotion();

  const toggleTask = (id: string) => {
    setTaskChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="max-w-[1280px] mx-auto"
    >
      {/* ── Greeting ─────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">
          {getGreeting()}, Alex
        </h1>
        <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] mt-2">
          What&apos;s worth your time today?
        </p>
      </div>

      {/* ── Ask Laylo Hero ───────────────────────────────────── */}
      <div className="relative mb-8">
        {/* Soft gold radial glow behind the hero — D4 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-8 -z-0"
          style={{
            background:
              'radial-gradient(circle at center, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0) 70%)',
          }}
        />
        <div className="relative">
          <AskLayloHero />
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatCard label="Pending Tasks" numericValue={5} icon={CheckSquare} />
        <StatCard label="Due This Week" numericValue={2} icon={CreditCard} accent />
        <StatCard label="Monthly Subs" numericValue={78.47} prefix="$" decimals={2} icon={DollarSign} />
      </div>

      {/* ── Banking Widgets (live data) ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1">
          <ConnectedAccountsCard />
        </div>
        <div className="lg:col-span-2">
          <RecentTransactionsCard />
        </div>
      </div>

      {/* ── AI Insights ──────────────────────────────────────── */}
      <section className="mb-8">
        <SectionTitle icon={Sparkles} title="AI Insights" />
        <ListStagger className="space-y-3">
          {DEMO_INSIGHTS.map((insight) => (
            <ListItem
              key={insight.id}
              whileHover={reduce ? undefined : { rotate: 1.5, y: -2, scale: 1.01 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="flex items-start gap-3 p-6 rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] border-l-4 border-l-[var(--color-accent)] hover:shadow-pop"
            >
              <insight.icon className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--color-text-muted)]" strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] leading-[22px] text-[var(--color-text)]">{insight.message}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                    {insight.label}
                  </span>
                  <AskAiChip prompt={insight.prompt} context={insight.message} label="Ask follow-up" />
                </div>
              </div>
            </ListItem>
          ))}
        </ListStagger>
      </section>

      {/* ── Today's Tasks ──────────────────────────────────── */}
      <section className="mb-8">
        <SectionTitle icon={CheckSquare} title="Today's Tasks" count={DEMO_TASKS.length} />
        <ListStagger className="space-y-3">
          {DEMO_TASKS.map((task) => {
            const isChecked = taskChecked[task.id] || false;
            return (
              <ListItem
                key={task.id}
                whileHover={reduce ? undefined : { y: -2, rotate: 1.5, scale: 1.01 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className={`group rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 hover:shadow-pop transition-shadow ${
                  isChecked ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleTask(task.id)}
                    aria-label={isChecked ? 'Mark incomplete' : 'Mark complete'}
                    className={`w-6 h-6 rounded-[8px] border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      isChecked
                        ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                        : 'border-[var(--color-border-strong)] hover:border-[var(--color-accent)]'
                    }`}
                  >
                    {isChecked && (
                      <Check className="w-4 h-4 text-[var(--color-text-on-accent)]" strokeWidth={3} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[16px] leading-[22px] font-semibold text-[var(--color-text)] ${isChecked ? 'line-through' : ''}`}>
                      {task.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                        {task.priority}
                      </span>
                      <span className="text-[13px] leading-[18px] font-medium px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                        {task.category}
                      </span>
                      <span className="flex items-center gap-1 text-[13px] leading-[18px] font-medium text-[var(--color-text-subtle)]">
                        <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
                        {format(new Date(task.dueDate), 'MMM d')}
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <AskAiChip prompt="Break into steps" context={task.title} iconOnly label="Ask" />
                  </div>
                </div>
              </ListItem>
            );
          })}
        </ListStagger>
      </section>

      {/* ── Bills Due This Week ─────────────────────────────── */}
      <section className="mb-8">
        <SectionTitle icon={CreditCard} title="Due This Week" />
        <ListStagger className="grid sm:grid-cols-2 gap-3">
          {DEMO_BILLS.map((bill) => (
            <ListItem
              key={bill.id}
              whileHover={reduce ? undefined : { y: -2, rotate: 1.5, scale: 1.01 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="group relative rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 hover:shadow-pop transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">{bill.name}</p>
                  <p className="text-[13px] leading-[18px] text-[var(--color-text-subtle)] flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
                    Due {format(new Date(bill.dueDate), 'EEEE, MMM d')}
                  </p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <AskAiChip prompt="Why did this go up?" context={bill.name} iconOnly label="Ask" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-[22px] leading-[28px] font-semibold tabular-nums text-[var(--color-text)]">
                  ${bill.amount.toFixed(2)}
                </p>
                {bill.autopay ? (
                  <span className="text-[13px] leading-[18px] font-medium px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-success)]">
                    Autopay
                  </span>
                ) : (
                  <span className="text-[13px] leading-[18px] font-medium px-2 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-warning)]">
                    Manual
                  </span>
                )}
              </div>
            </ListItem>
          ))}
        </ListStagger>
      </section>

      {/* ── Empty hint ──────────────────────────────────────── */}
      <section className="mb-8">
        <div className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-12 flex flex-col items-center text-center">
          <BeeStanding size={96} />
          <h3 className="mt-4 text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
            Quiet hive today
          </h3>
          <p className="mt-2 max-w-md text-[15px] leading-[22px] text-[var(--color-text-muted)]">
            Add a few things and Laylo will start spotting patterns.
          </p>
          <div className="mt-6">
            <AskAiChip prompt="Help me add my first bill" label="Ask Laylo to add something" />
          </div>
        </div>
      </section>
    </motion.div>
  );
}

