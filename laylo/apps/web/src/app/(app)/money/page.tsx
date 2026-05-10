'use client';

/**
 * Money hub — Bento Grid 1+4 with Live Numbers
 * (LAYOUT_REDESIGN_BRIEF §2.4).
 *
 * Large outflow tile (information, not a link) + 6-month sparkline.
 * Four smaller hub cards (Bills, Subs, Transactions, Banks) with live counts +
 * one-line previews. AskLayloHero shrinks to a top-right chip.
 */
import { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CreditCard,
  RefreshCw,
  ArrowLeftRight,
  Landmark,
  ArrowRight,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { AskAiChip } from '@/components/ai/ask-ai';
import { AnimatedNumber } from '@/components/motion/animated-number';
import { Sparkline } from '@/components/layout/sparkline';
import { useMilestoneTracker } from '@/components/celebrations/milestone-toast';

// Demo numbers — would be live tRPC reads in production.
const MONTHLY_OUTFLOW = 2752.47;
const SIX_MONTH_TREND = [2480, 2615, 2390, 2810, 2545, 2752];

const HUB_CARDS = [
  {
    label: 'Bills',
    href: '/bills',
    icon: CreditCard,
    count: 5,
    preview: 'Next: Rent in 5 days',
    miniList: ['Rent · in 5d', 'Internet · in 12d', 'Car insurance · in 8d'],
  },
  {
    label: 'Subscriptions',
    href: '/bills?tab=subscriptions',
    icon: RefreshCw,
    count: 6,
    preview: '$78.47/mo · Gym renews in 3d',
    miniList: ['Gym · in 3d', 'Spotify · in 7d', 'Netflix · in 14d'],
  },
  {
    label: 'Transactions',
    href: '/transactions',
    icon: ArrowLeftRight,
    count: 124,
    preview: 'Last 7 days · $612 spent',
    miniList: ['Whole Foods · -$84', 'Spotify · -$10.99', 'Salary · +$3,200'],
  },
  {
    label: 'Banks',
    href: '/settings/banks',
    icon: Landmark,
    count: 2,
    preview: 'Chase · Capital One · in sync',
    miniList: ['Chase Checking ····4129', 'Capital One Savings ····8012'],
  },
];

export default function MoneyPage() {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);

  // Milestone — fired once per session when outflow exceeds last month avg.
  useMilestoneTracker(
    'monthly_outflow',
    2500,
    MONTHLY_OUTFLOW,
    'You crossed your typical monthly outflow. Want a heads-up next time?',
  );

  return (
    <div className="relative max-w-[1024px] mx-auto">
      {/* Header + Ask chip */}
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Money</h1>
          <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] mt-1">
            Bills, subscriptions, transactions, and banks — all in one hive.
          </p>
        </div>
        <AskAiChip
          prompt="Show me where my money's going this month"
          label="Ask Laylo"
        />
      </header>

      {/* Bento — 1 hero + 4 hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
        {/* Hero outflow tile (right 7 cols, full row 1) */}
        <motion.div
          whileHover={reduce ? undefined : { y: -2, rotate: 0.4, scale: 1.005 }}
          transition={{ duration: 0.25 }}
          className="lg:col-span-7 lg:row-span-2 relative rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 lg:p-8 overflow-hidden hover:shadow-pop transition-shadow"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 70% 30%, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0) 60%)',
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown
                className="w-4 h-4 text-[var(--color-accent-dim)]"
                strokeWidth={1.75}
              />
              <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-accent-dim)]">
                This month&apos;s outflow
              </p>
            </div>
            <p className="text-[56px] leading-[60px] font-bold tabular-nums text-[var(--color-text)] mt-2">
              <AnimatedNumber value={MONTHLY_OUTFLOW} prefix="$" decimals={2} duration={0.8} />
            </p>
            <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] mt-2">
              Across {HUB_CARDS[0]!.count} bills + {HUB_CARDS[1]!.count} subs.
            </p>
            <div className="mt-6">
              <Sparkline values={SIX_MONTH_TREND} width={420} height={72} />
              <div className="flex justify-between text-[11px] leading-[14px] text-[var(--color-text-subtle)] mt-1 tabular-nums">
                <span>6 mo ago</span>
                <span>now</span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <AskAiChip
                prompt="Why did spending change?"
                context="Monthly outflow trend"
                label="Why this changed"
              />
              <AskAiChip
                prompt="Find ways to save"
                context="Subscriptions + bills"
                label="Find savings"
              />
            </div>
          </div>
        </motion.div>

        {/* Four hub cards — 5 cols wide, 2 per row over 2 rows */}
        {HUB_CARDS.map((card) => {
          const isHovered = hovered === card.href;
          return (
            <motion.div
              key={card.href}
              onHoverStart={() => setHovered(card.href)}
              onHoverEnd={() => setHovered(null)}
              whileHover={reduce ? undefined : { y: -2, rotate: 1.5, scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="lg:col-span-5 sm:col-span-1 sm:[&:nth-child(2n)]:col-start-1"
            >
              <Link
                href={card.href}
                className="group relative block rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-5 hover:shadow-pop transition-all overflow-hidden h-full"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
                    <card.icon
                      className="w-5 h-5 text-[var(--color-accent)]"
                      strokeWidth={1.75}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
                        {card.label}
                      </h3>
                      <ArrowRight
                        className="w-4 h-4 text-[var(--color-text-subtle)] group-hover:text-[var(--color-accent)] group-hover:translate-x-1 transition-all"
                        strokeWidth={1.75}
                      />
                    </div>
                    <p className="text-[22px] leading-[28px] font-semibold tabular-nums text-[var(--color-text)] mt-1">
                      {card.count}
                    </p>
                    <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] mt-1">
                      {card.preview}
                    </p>
                  </div>
                </div>
                {/* Hover preview — expand a 3-row mini list */}
                <motion.div
                  initial={false}
                  animate={
                    isHovered
                      ? { height: 'auto', opacity: 1 }
                      : { height: 0, opacity: 0 }
                  }
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <ul className="mt-4 pt-3 border-t border-[var(--color-border)] space-y-1">
                    {card.miniList.map((m, i) => (
                      <li
                        key={i}
                        className="text-[12px] leading-[16px] text-[var(--color-text-muted)]"
                      >
                        {m}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="mt-6 flex items-center gap-2 text-[13px] leading-[18px] text-[var(--color-text-muted)] flex-wrap">
        <Sparkles className="w-4 h-4 text-[var(--color-accent)]" strokeWidth={1.75} />
        <span>Need a deeper view? Ask Laylo to break it down.</span>
        <AskAiChip prompt="Break down this month's spending" label="Try a prompt" />
      </div>
    </div>
  );
}
