'use client';

/**
 * Dashboard banking widgets — REDESIGN_BRIEF.md §2.1.
 * - Indigo replaced with semantic gold tokens.
 * - Plaid behaviour preserved exactly.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Banknote,
  Building2,
  Receipt,
  ArrowRight,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';
import { listAccounts, listTransactions } from '@/lib/api/transactions';
import type { BankAccount, Transaction } from '@/lib/api/types';

function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Connected Accounts Card ─────────────────────────────────────────
export function ConnectedAccountsCard() {
  const reduce = useReducedMotion();
  const [accounts, setAccounts] = useState<BankAccount[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listAccounts()
      .then((data) => {
        if (!cancelled) setAccounts(data);
      })
      .catch(() => {
        if (!cancelled) setAccounts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalBalance =
    accounts?.reduce((sum, a) => {
      if (a.type !== 'DEPOSITORY') return sum;
      return sum + toNumber(a.currentBalance);
    }, 0) ?? 0;

  const accountCount = accounts?.length ?? 0;
  const isEmpty = !loading && accountCount === 0;

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.2 }}
      className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 hover:shadow-pop transition-shadow"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
          <Banknote className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
            Connected Accounts
          </p>
          {loading ? (
            <div className="h-7 w-32 rounded-[8px] bg-[var(--color-surface-2)] animate-pulse mt-1" />
          ) : isEmpty ? (
            <p className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)] mt-0.5">
              No banks linked
            </p>
          ) : (
            <p className="text-[22px] leading-[28px] font-semibold text-[var(--color-text)] mt-0.5 tabular-nums">
              {formatCurrency(totalBalance)}
            </p>
          )}
        </div>
      </div>
      {!loading && (
        <div className="flex items-center justify-between">
          <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)]">
            {isEmpty
              ? 'Connect a bank — we\'ll handle the honey trail.'
              : `${accountCount} ${accountCount === 1 ? 'account' : 'accounts'} connected`}
          </p>
          <Link
            href="/settings/banks"
            className="inline-flex items-center gap-1 text-[13px] leading-[18px] font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
          >
            {isEmpty ? 'Connect a bank' : 'Manage'}
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </Link>
        </div>
      )}
    </motion.div>
  );
}

// ─── Recent Transactions Card ────────────────────────────────────────
export function RecentTransactionsCard() {
  const reduce = useReducedMotion();
  const [items, setItems] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listTransactions({ limit: 10 })
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -1 }}
      transition={{ duration: 0.2 }}
      className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
          <h3 className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
            Recent transactions
          </h3>
        </div>
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1 text-[13px] leading-[18px] font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
        >
          View all
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
        </Link>
      </div>

      {loading ? (
        <div className="p-5 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-[8px] bg-[var(--color-surface-2)] animate-pulse" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="p-8 text-center">
          <div className="mx-auto w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center mb-2">
            <Building2 className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
          </div>
          <p className="text-[13px] leading-[18px] font-medium text-[var(--color-text)]">
            Connect a bank to see what&apos;s been flowing
          </p>
          <p className="text-[11px] leading-[14px] text-[var(--color-text-subtle)] mt-1">
            Connect a bank to see activity here
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {items.map((t) => {
            const amt = toNumber(t.amount);
            const isInflow = amt < 0;
            return (
              <li
                key={t.id}
                className={`flex items-center gap-3 px-6 py-3 hover:bg-[var(--color-surface-hover)] transition-colors ${
                  t.pending ? 'opacity-60' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
                  {isInflow ? (
                    <ArrowDownCircle className="w-4 h-4 text-[var(--color-success)]" strokeWidth={1.75} />
                  ) : (
                    <ArrowUpCircle className="w-4 h-4 text-[var(--color-text-subtle)]" strokeWidth={1.75} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] leading-[18px] font-medium text-[var(--color-text)] truncate">
                    {t.merchantName || t.name}
                    {t.pending && (
                      <span className="ml-2 text-[11px] leading-[14px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-warning)]">
                        Pending
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] leading-[14px] text-[var(--color-text-subtle)]">
                    {formatDate(t.date)}
                    {t.category ? ` · ${t.category}` : ''}
                  </p>
                </div>
                <span
                  className={`text-[13px] leading-[18px] font-semibold tabular-nums ${
                    isInflow ? 'text-[var(--color-success)]' : 'text-[var(--color-text)]'
                  }`}
                >
                  {isInflow ? '+' : '−'}
                  {formatCurrency(Math.abs(amt), t.isoCurrencyCode || 'USD')}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}

// Spinner export so the dashboard can render a fallback during SSR.
export function WidgetsSkeleton() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-5 h-5 animate-spin text-[var(--color-accent)]" strokeWidth={1.75} />
    </div>
  );
}
