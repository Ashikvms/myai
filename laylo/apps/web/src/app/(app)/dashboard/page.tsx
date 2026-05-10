'use client';

/**
 * Dashboard — Bento Grid 2+3+1 (LAYOUT_REDESIGN_BRIEF §2.1).
 *
 * 12-col × 4-row asymmetric grid:
 *   row 1: HERO (1–8) Ask Beedo + greeting        | STAT (9–12) day's headline
 *   row 2: INSIGHT-LG (1–5) | INSIGHT (6–8)       | STREAK (9–12)
 *   row 3: BILLS (1–7) horizontal pair             | TASK (8–12) one-task tile
 *   below: banking widgets as a footer row
 *
 * Mobile = single column (greeting → hero stat → insight → today's task →
 * bills horizontal scroll → banking).
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
  Flame,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  ConnectedAccountsCard,
  RecentTransactionsCard,
} from '@/components/banking/dashboard-widgets';
import { AskBeedoHero, AskAiChip } from '@/components/ai/ask-ai';
import {
  BeeStanding,
  BeeMagnifying,
  BeeSleeping,
} from '@/components/illustrations/bee';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { getGreeting, getBeePoseForHour } from '@/lib/greeting';
import { useMilestoneTracker } from '@/components/celebrations/milestone-toast';

// ─── Demo Data ───────────────────────────────────────────────────────
const DEMO_TASKS = [
  { id: '1', title: 'Renew car insurance policy', priority: 'high' as const, category: 'Insurance', dueDate: '2026-05-17', completed: false },
  { id: '2', title: 'Schedule annual dental checkup', priority: 'medium' as const, category: 'Health', dueDate: '2026-05-20', completed: false },
  { id: '3', title: 'File quarterly tax documents', priority: 'high' as const, category: 'Finance', dueDate: '2026-05-15', completed: true },
  { id: '4', title: 'Buy groceries for the week', priority: 'low' as const, category: 'Personal', dueDate: '2026-04-29', completed: false },
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

const STREAK_DAYS = 4;

// ─── Bee picker ──────────────────────────────────────────────────────
function HourlyBee({ size = 56 }: { size?: number }) {
  const pose = getBeePoseForHour();
  if (pose === 'sleeping') return <BeeSleeping size={size} />;
  if (pose === 'magnifying') return <BeeMagnifying size={size} />;
  return <BeeStanding size={size} />;
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const reduce = useReducedMotion();
  const [taskChecked, setTaskChecked] = useState<Record<string, boolean>>({ '3': true });
  const [insightIndex, setInsightIndex] = useState(0);

  // Insight roulette — wide insight rotates every 8s.
  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => {
      setInsightIndex((i) => (i + 1) % DEMO_INSIGHTS.length);
    }, 8000);
    return () => window.clearInterval(t);
  }, [reduce]);

  const todayTask = DEMO_TASKS.find((t) => !t.completed && !taskChecked[t.id]);
  const tasksCleared = DEMO_TASKS.filter(
    (t) => t.completed || taskChecked[t.id],
  ).length;

  // Milestone — fired once per session when 3+ tasks cleared.
  useMilestoneTracker(
    'tasks_cleared',
    3,
    tasksCleared,
    `${tasksCleared} tasks cleared this week. The hive thanks you.`,
  );

  const greeting = getGreeting('Alex');
  const wideInsight = DEMO_INSIGHTS[insightIndex] ?? DEMO_INSIGHTS[0]!;
  const sideInsight = DEMO_INSIGHTS[(insightIndex + 1) % DEMO_INSIGHTS.length]!;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="max-w-[1280px] mx-auto"
    >
      {/* ── Bento Grid ─────────────────────────────────────────────────
          Mobile = single column; ≥lg = 12-col / multi-row layout. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
        {/* ── HERO (1–8, row 1) ─────────────────────────────── */}
        <BentoTile
          className="lg:col-span-8 relative overflow-hidden"
          padded={false}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 30% 50%, rgba(255,215,0,0.18) 0%, rgba(255,215,0,0) 65%)',
            }}
          />
          <div className="relative p-6 lg:p-8 flex flex-col h-full min-h-[220px]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-accent-dim)]">
                  Today
                </p>
                <h1 className="text-[32px] leading-[38px] font-bold text-[var(--color-text)] mt-1">
                  {greeting}
                </h1>
                <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] mt-1">
                  What&apos;s worth your time?
                </p>
              </div>
              <div className="hidden sm:block flex-shrink-0">
                <HourlyBee size={64} />
              </div>
            </div>
            <div className="mt-auto">
              <AskBeedoHero placeholder={`${greeting.split(',')[0]}. Ask anything…`} />
            </div>
          </div>
        </BentoTile>

        {/* ── HERO STAT (9–12, row 1) — the day's headline ──── */}
        <BentoTile className="lg:col-span-4 flex flex-col justify-between">
          <div>
            <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
              Next up
            </p>
            <p className="text-[22px] leading-[28px] font-semibold text-[var(--color-text)] mt-2">
              Car insurance
            </p>
            <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] mt-1">
              Due in 3 days
            </p>
          </div>
          <div className="mt-4">
            <p className="text-[40px] leading-[44px] font-bold tabular-nums text-[var(--color-accent)]">
              <AnimatedNumber value={185} prefix="$" decimals={0} />
            </p>
            <div className="mt-3">
              <AskAiChip prompt="When does this expire?" context="Car insurance" label="Ask Beedo" />
            </div>
          </div>
        </BentoTile>

        {/* ── INSIGHT WIDE (1–5, row 2) ──────────────────────── */}
        <BentoTile className="lg:col-span-5 relative overflow-hidden">
          <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] mb-3">
            Insight
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={wideInsight.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-start gap-3">
                <wideInsight.icon
                  className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--color-accent)]"
                  strokeWidth={1.75}
                />
                <p className="text-[16px] leading-[22px] text-[var(--color-text)]">
                  {wideInsight.message}
                </p>
              </div>
              <div className="mt-4">
                <AskAiChip
                  prompt={wideInsight.prompt}
                  context={wideInsight.message}
                  label="Ask follow-up"
                />
              </div>
            </motion.div>
          </AnimatePresence>
          {/* Drain bar — visualises the 8s rotation */}
          {!reduce && (
            <motion.div
              key={`drain-${wideInsight.id}`}
              aria-hidden="true"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 8, ease: 'linear' }}
              className="absolute bottom-0 left-0 h-[1px] bg-[var(--color-accent)]"
            />
          )}
        </BentoTile>

        {/* ── INSIGHT NARROW (6–8, row 2) ────────────────────── */}
        <BentoTile className="lg:col-span-3">
          <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] mb-3">
            Spotted
          </p>
          <div className="flex items-start gap-3">
            <sideInsight.icon
              className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--color-text-muted)]"
              strokeWidth={1.75}
            />
            <p className="text-[15px] leading-[22px] text-[var(--color-text)]">
              {sideInsight.message}
            </p>
          </div>
        </BentoTile>

        {/* ── STREAK (9–12, row 2) ────────────────────────────── */}
        <BentoTile className="lg:col-span-4 relative overflow-hidden">
          <div className="flex items-start gap-3">
            <Flame
              className="w-5 h-5 text-[var(--color-accent)] mt-0.5"
              strokeWidth={1.75}
            />
            <div className="flex-1">
              <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                Streak
              </p>
              <p className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)] mt-1">
                Cleared tasks <span className="tabular-nums">{STREAK_DAYS}</span> days in a row
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background:
                    i < STREAK_DAYS
                      ? 'var(--color-accent)'
                      : 'var(--color-border-strong)',
                }}
              />
            ))}
          </div>
        </BentoTile>

        {/* ── BILLS (1–7, row 3) — horizontal pair ─────────── */}
        <BentoTile className="lg:col-span-7" padded={false}>
          <div className="p-6 pb-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                Due this week
              </p>
              <span className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                {DEMO_BILLS.length}
              </span>
            </div>
          </div>
          <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEMO_BILLS.map((bill) => (
              <div
                key={bill.id}
                className="rounded-[16px] bg-[var(--color-surface-2)] p-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-[8px] bg-[var(--color-surface)] flex items-center justify-center">
                    <DollarSign
                      className="w-4 h-4 text-[var(--color-accent)]"
                      strokeWidth={1.75}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-[18px] font-semibold text-[var(--color-text)] truncate">
                      {bill.name}
                    </p>
                    <p className="text-[11px] leading-[14px] text-[var(--color-text-subtle)] flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" strokeWidth={1.75} />
                      {format(new Date(bill.dueDate), 'EEE MMM d')}
                    </p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-[18px] leading-[22px] font-semibold tabular-nums text-[var(--color-text)]">
                    ${bill.amount.toFixed(2)}
                  </p>
                  {bill.autopay ? (
                    <span className="inline-flex items-center gap-1 text-[11px] leading-[14px] font-medium text-[var(--color-success)]">
                      <Zap className="w-3 h-3" strokeWidth={1.75} />
                      Auto
                    </span>
                  ) : (
                    <span className="text-[11px] leading-[14px] font-medium text-[var(--color-warning)]">
                      Manual
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </BentoTile>

        {/* ── TASK (8–12, row 3) — single most-urgent task ─── */}
        <BentoTile className="lg:col-span-5 flex flex-col">
          <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] mb-3">
            Today&apos;s task
          </p>
          {todayTask ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={todayTask.id}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, y: -24, transition: { type: 'spring', stiffness: 400, damping: 30 } }
                }
                className="flex items-start gap-4"
              >
                <button
                  onClick={() =>
                    setTaskChecked((p) => ({ ...p, [todayTask.id]: true }))
                  }
                  aria-label="Mark complete"
                  className="w-7 h-7 rounded-[8px] border-2 border-[var(--color-border-strong)] hover:border-[var(--color-accent)] flex items-center justify-center transition-colors flex-shrink-0 mt-0.5"
                >
                  <Check
                    className="w-4 h-4 text-transparent group-hover:text-[var(--color-accent)]"
                    strokeWidth={3}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
                    {todayTask.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                      {todayTask.priority}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] leading-[14px] text-[var(--color-text-subtle)]">
                      <Clock className="w-3 h-3" strokeWidth={1.75} />
                      {format(new Date(todayTask.dueDate), 'MMM d')}
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <BeeSleeping size={56} />
              <p className="mt-3 text-[13px] leading-[18px] text-[var(--color-text-muted)]">
                Inbox zero. Free as a bee.
              </p>
            </div>
          )}
        </BentoTile>
      </div>

      {/* ── Footer banking row (live data) ──────────────────────── */}
      <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <ConnectedAccountsCard />
        </div>
        <div className="lg:col-span-2">
          <RecentTransactionsCard />
        </div>
      </section>

      {/* ── Empty hint ──────────────────────────────────────── */}
      <section className="mt-8">
        <div className="flex items-center gap-2 text-[13px] leading-[18px] text-[var(--color-text-muted)] flex-wrap">
          <Sparkles className="w-4 h-4 text-[var(--color-accent)]" strokeWidth={1.75} />
          <span>Want Beedo to add something for you?</span>
          <AskAiChip prompt="Help me add my first bill" label="Try a prompt" />
        </div>
      </section>
    </motion.div>
  );
}

// ─── Bento Tile primitive ────────────────────────────────────────────
function BentoTile({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -2, rotate: 0.4, scale: 1.005 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={[
        'relative rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden hover:shadow-pop transition-shadow',
        padded ? 'p-6' : '',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </motion.div>
  );
}
