'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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

  // Sum balance across DEPOSITORY accounts (cash on hand). Credit cards
  // and loans show negative-style numbers and would distort the headline.
  const totalBalance =
    accounts?.reduce((sum, a) => {
      if (a.type !== 'DEPOSITORY') return sum;
      return sum + toNumber(a.currentBalance);
    }, 0) ?? 0;

  const accountCount = accounts?.length ?? 0;
  const isEmpty = !loading && accountCount === 0;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="relative overflow-hidden bg-white dark:bg-card-dark rounded-xl border border-gray-200/60 dark:border-gray-700/30 p-5"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
            <Banknote className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Connected Accounts
            </p>
            {loading ? (
              <div className="h-7 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mt-1" />
            ) : isEmpty ? (
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-200 mt-0.5">
                No banks linked
              </p>
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5 tabular-nums">
                {formatCurrency(totalBalance)}
              </p>
            )}
          </div>
        </div>
        {!loading && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isEmpty
                ? 'Sync your spending automatically'
                : `${accountCount} ${accountCount === 1 ? 'account' : 'accounts'} connected`}
            </p>
            <Link
              href="/settings/banks"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#6366F1] hover:text-[#4F46E5] transition-colors"
            >
              {isEmpty ? 'Connect a bank' : 'Manage'}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Recent Transactions Card ────────────────────────────────────────
export function RecentTransactionsCard() {
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
      whileHover={{ y: -1 }}
      transition={{ duration: 0.2 }}
      className="bg-white dark:bg-card-dark rounded-xl border border-gray-200/60 dark:border-gray-700/30 overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#6366F1]" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Recent transactions
          </h3>
        </div>
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#6366F1] hover:text-[#4F46E5] transition-colors"
        >
          View all
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="p-5 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="p-8 text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center mb-2">
            <Building2 className="w-5 h-5 text-[#6366F1]" />
          </div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
            No transactions yet
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Connect a bank to see activity here
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((t) => {
            const amt = toNumber(t.amount);
            const isInflow = amt < 0;
            return (
              <li
                key={t.id}
                className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${
                  t.pending ? 'opacity-60' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  {isInflow ? (
                    <ArrowDownCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowUpCircle className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {t.merchantName || t.name}
                    {t.pending && (
                      <span className="ml-2 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                        Pending
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {formatDate(t.date)}
                    {t.category ? ` · ${t.category}` : ''}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    isInflow
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-900 dark:text-white'
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
      <Loader2 className="w-5 h-5 animate-spin text-[#6366F1]" />
    </div>
  );
}
