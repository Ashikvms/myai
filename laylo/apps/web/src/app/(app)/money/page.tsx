'use client';

/**
 * Money hub page — REDESIGN_BRIEF.md §3.1.
 * Lands on /money. Cards link to Bills, Subscriptions, Transactions, Banks.
 */
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CreditCard,
  RefreshCw,
  ArrowLeftRight,
  Landmark,
  ArrowRight,
} from 'lucide-react';
import { AskLayloHero } from '@/components/ai/ask-ai';

const HUB_CARDS = [
  {
    label: 'Bills',
    href: '/bills',
    icon: CreditCard,
    description: 'Track recurring bills and due dates.',
  },
  {
    label: 'Subscriptions',
    href: '/bills?tab=subscriptions',
    icon: RefreshCw,
    description: 'See every subscription on autopay.',
  },
  {
    label: 'Transactions',
    href: '/transactions',
    icon: ArrowLeftRight,
    description: 'Browse spending across accounts.',
  },
  {
    label: 'Banks',
    href: '/settings/banks',
    icon: Landmark,
    description: 'Connect and manage Plaid accounts.',
  },
];

export default function MoneyPage() {
  const reduce = useReducedMotion();
  return (
    <div className="max-w-[960px] mx-auto">
      <header className="mb-8">
        <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Money</h1>
        <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] mt-2">
          Bills, subscriptions, transactions, and banks — all in one hive.
        </p>
      </header>

      <div className="mb-8">
        <AskLayloHero placeholder="Ask Laylo about your spending, bills, or subs…" />
      </div>

      <motion.ul
        initial={reduce ? false : 'hidden'}
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
        }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {HUB_CARDS.map((card) => (
          <motion.li
            key={card.href}
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } },
            }}
          >
            <Link
              href={card.href}
              className="group block rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 hover:border-[var(--color-border-strong)] hover:shadow-pop transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
                  <card.icon className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">{card.label}</h3>
                    <ArrowRight
                      className="w-4 h-4 text-[var(--color-text-subtle)] group-hover:text-[var(--color-accent)] group-hover:translate-x-1 transition-all"
                      strokeWidth={1.75}
                    />
                  </div>
                  <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] mt-1">
                    {card.description}
                  </p>
                </div>
              </div>
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}
