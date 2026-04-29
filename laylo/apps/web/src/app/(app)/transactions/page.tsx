'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  AlertCircle,
  Loader2,
  Receipt,
  Search,
  Filter,
  X,
} from 'lucide-react';
import {
  listAccounts,
  listTransactions,
} from '@/lib/api/transactions';
import type {
  BankAccount,
  Transaction,
  TransactionsQuery,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api';

// ─── Helpers ─────────────────────────────────────────────────────────
function toNumber(amount: string | number): number {
  if (typeof amount === 'number') return amount;
  const n = parseFloat(amount);
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(amount: string | number, currency: string): string {
  const value = Math.abs(toNumber(amount));
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
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
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const PAGE_SIZE = 50;

// ─── Page ────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  // Filters
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [accountId, setAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Data
  const [items, setItems] = useState<Transaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Build query — memoised so effects don't churn.
  const baseQuery: TransactionsQuery = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      accountId: accountId || undefined,
      category: category || undefined,
      q: q || undefined,
      limit: PAGE_SIZE,
    }),
    [from, to, accountId, category, q],
  );

  // Load accounts once for the dropdown.
  useEffect(() => {
    let cancelled = false;
    listAccounts()
      .then((data) => {
        if (!cancelled) setAccounts(data);
      })
      .catch(() => {
        // Non-fatal — filter UI just won't have account options.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reload first page whenever filters change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listTransactions(baseQuery)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setNextCursor(res.nextCursor);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? err.message
            : 'Could not load transactions';
        setError(msg);
        setItems([]);
        setNextCursor(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseQuery]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listTransactions({
        ...baseQuery,
        cursor: nextCursor,
      });
      setItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Could not load more transactions';
      setError(msg);
    } finally {
      setLoadingMore(false);
    }
  }, [baseQuery, nextCursor, loadingMore]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setQ(searchInput.trim());
  }, [searchInput]);

  // Distinct categories from the loaded set, for the dropdown.
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  }, [items]);

  const accountById = useMemo(() => {
    const map = new Map<string, BankAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  const hasActiveFilters = !!(
    from ||
    to ||
    accountId ||
    category ||
    q
  );

  const clearFilters = () => {
    setFrom('');
    setTo('');
    setAccountId('');
    setCategory('');
    setQ('');
    setSearchInput('');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-purple-500 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Transactions
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              All synced bank transactions
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-[#6366F1] text-white">
              {[from, to, accountId, category, q].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Search + Filters */}
      <div className="mb-5 space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search merchant or description..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
          />
        </form>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700"
          >
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
              >
                <option value="">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.mask ? ` ····${a.mask}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
              >
                <option value="">All categories</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="sm:col-span-2 lg:col-span-4 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear all filters
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-sm text-rose-700 dark:text-rose-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl bg-white dark:bg-[#1A1A1A] border border-gray-200/60 dark:border-gray-700/30 overflow-hidden">
        <div className="hidden md:grid grid-cols-[110px_1fr_140px_140px_120px] gap-4 px-5 py-3 border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <div>Date</div>
          <div>Merchant</div>
          <div>Category</div>
          <div>Account</div>
          <div className="text-right">Amount</div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-[#6366F1]/10 flex items-center justify-center mb-3">
              <Receipt className="w-6 h-6 text-[#6366F1]" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              No transactions found
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {hasActiveFilters
                ? 'Try adjusting your filters or date range.'
                : 'Connect a bank in Settings → Banks to start syncing.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((t) => {
              // Plaid convention: positive amount = outflow.
              const amt = toNumber(t.amount);
              const isInflow = amt < 0;
              const acct =
                accountById.get(t.bankAccountId) ?? t.bankAccount;
              return (
                <div
                  key={t.id}
                  className={`grid grid-cols-[1fr_auto] md:grid-cols-[110px_1fr_140px_140px_120px] gap-2 md:gap-4 px-5 py-3.5 items-center text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40 ${
                    t.pending ? 'opacity-60' : ''
                  }`}
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400 md:text-sm md:text-gray-700 md:dark:text-gray-300 order-1">
                    {formatDate(t.date)}
                  </div>
                  <div className="min-w-0 order-3 md:order-2 col-span-2 md:col-span-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {t.merchantName || t.name}
                      {t.pending && (
                        <span className="ml-2 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                          Pending
                        </span>
                      )}
                    </p>
                    {t.merchantName && t.name !== t.merchantName && (
                      <p className="text-[11px] text-gray-400 truncate">
                        {t.name}
                      </p>
                    )}
                  </div>
                  <div className="hidden md:block order-3 text-xs text-gray-500 dark:text-gray-400 truncate">
                    {t.category || '—'}
                  </div>
                  <div className="hidden md:flex items-center gap-1.5 order-4 text-xs text-gray-500 dark:text-gray-400 min-w-0">
                    <Building2 className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">
                      {acct?.name ?? '—'}
                      {acct && 'mask' in acct && acct.mask
                        ? ` ····${acct.mask}`
                        : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 order-2 md:order-5">
                    {isInflow ? (
                      <ArrowDownCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowUpCircle className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    )}
                    <span
                      className={`font-semibold tabular-nums ${
                        isInflow
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {isInflow ? '+' : '−'}
                      {formatAmount(t.amount, t.isoCurrencyCode)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {!loading && nextCursor && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
