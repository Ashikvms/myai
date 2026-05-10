'use client';

/**
 * Transactions page — REDESIGN_BRIEF.md §2.7.
 * - All indigo replaced with semantic tokens.
 * - Per-row AskAi chip ("Why did this repeat?") on hover.
 * - Behaviour preserved: Plaid sync flow untouched.
 */
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
import { AskAiChip } from '@/components/ai/ask-ai';
import { BeeMagnifying, BeeStanding } from '@/components/illustrations/bee';

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

const inputClass =
  'w-full px-3 py-2 rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[13px] leading-[18px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25';

export default function TransactionsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [accountId, setAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [items, setItems] = useState<Transaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    listAccounts()
      .then((data) => {
        if (!cancelled) setAccounts(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
        const msg = err instanceof ApiError ? err.message : 'Hmm, something stung. Try again?';
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
      const res = await listTransactions({ ...baseQuery, cursor: nextCursor });
      setItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not load more transactions';
      setError(msg);
    } finally {
      setLoadingMore(false);
    }
  }, [baseQuery, nextCursor, loadingMore]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setQ(searchInput.trim());
  }, [searchInput]);

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

  const hasActiveFilters = !!(from || to || accountId || category || q);

  const clearFilters = () => {
    setFrom('');
    setTo('');
    setAccountId('');
    setCategory('');
    setQ('');
    setSearchInput('');
  };

  return (
    <div className="max-w-[960px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
            <Receipt className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Transactions</h1>
            <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] mt-1">
              All synced bank transactions
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="inline-flex items-center gap-2 px-3 h-10 rounded-[16px] text-[13px] font-medium text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <Filter className="w-4 h-4" strokeWidth={1.75} />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 text-[11px] font-bold rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-on-accent)] px-1.5">
              {[from, to, accountId, category, q].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Search + Filters */}
      <div className="mb-5 space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-subtle)]" strokeWidth={1.75} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search merchant or description…"
            className="w-full pl-10 pr-4 py-2.5 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
          />
        </form>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)]"
          >
            <div>
              <label className="block text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] mb-1.5">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] mb-1.5">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] mb-1.5">Account</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
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
              <label className="block text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] mb-1.5">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                <option value="">All categories</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="sm:col-span-2 lg:col-span-4 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[8px] text-[13px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                Clear all filters
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-[8px] bg-[var(--color-surface)] border-l-4 border-[var(--color-danger)] text-[13px] text-[var(--color-danger)] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
        <div className="hidden md:grid grid-cols-[110px_1fr_140px_140px_120px] gap-4 px-5 py-3 border-b border-[var(--color-border)] text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
          <div>Date</div>
          <div>Merchant</div>
          <div>Category</div>
          <div>Account</div>
          <div className="text-right">Amount</div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-[8px] bg-[var(--color-surface-2)] animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 flex flex-col items-center text-center">
            {hasActiveFilters ? <BeeMagnifying size={96} /> : <BeeStanding size={96} />}
            <p className="mt-4 text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
              {hasActiveFilters ? "Couldn't find anything" : 'Connect a bank to see what’s been flowing'}
            </p>
            <p className="mt-2 text-[13px] leading-[18px] text-[var(--color-text-muted)]">
              {hasActiveFilters
                ? 'Try adjusting your filters or date range.'
                : 'Connect a bank in Settings → Banks to start syncing.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {items.map((t) => {
              const amt = toNumber(t.amount);
              const isInflow = amt < 0;
              const acct = accountById.get(t.bankAccountId) ?? t.bankAccount;
              return (
                <div
                  key={t.id}
                  className={`group grid grid-cols-[1fr_auto] md:grid-cols-[110px_1fr_140px_140px_120px] gap-2 md:gap-4 px-5 py-3.5 items-center text-[13px] leading-[18px] transition-colors hover:bg-[var(--color-surface-hover)] ${
                    t.pending ? 'opacity-60' : ''
                  }`}
                >
                  <div className="text-[11px] text-[var(--color-text-subtle)] md:text-[13px] md:text-[var(--color-text-muted)] order-1">
                    {formatDate(t.date)}
                  </div>
                  <div className="min-w-0 order-3 md:order-2 col-span-2 md:col-span-1">
                    <p className="text-[13px] leading-[18px] font-medium text-[var(--color-text)] truncate">
                      {t.merchantName || t.name}
                      {t.pending && (
                        <span className="ml-2 text-[11px] leading-[14px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-warning)]">
                          Pending
                        </span>
                      )}
                    </p>
                    {t.merchantName && t.name !== t.merchantName && (
                      <p className="text-[11px] text-[var(--color-text-subtle)] truncate">{t.name}</p>
                    )}
                  </div>
                  <div className="hidden md:block order-3 text-[13px] text-[var(--color-text-muted)] truncate">
                    {t.category || '—'}
                  </div>
                  <div className="hidden md:flex items-center gap-1.5 order-4 text-[13px] text-[var(--color-text-muted)] min-w-0">
                    <Building2 className="w-3 h-3 flex-shrink-0" strokeWidth={1.75} />
                    <span className="truncate">
                      {acct?.name ?? '—'}
                      {acct && 'mask' in acct && acct.mask ? ` ····${acct.mask}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 order-2 md:order-5">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <AskAiChip
                        prompt="Why did this repeat?"
                        context={`Transaction: ${t.merchantName || t.name}, ${formatAmount(t.amount, t.isoCurrencyCode)}`}
                        iconOnly
                        label="Ask"
                      />
                    </span>
                    {isInflow ? (
                      <ArrowDownCircle className="w-4 h-4 text-[var(--color-success)]" strokeWidth={1.75} />
                    ) : (
                      <ArrowUpCircle className="w-4 h-4 text-[var(--color-text-subtle)]" strokeWidth={1.75} />
                    )}
                    <span
                      className={`font-semibold tabular-nums ${
                        isInflow ? 'text-[var(--color-success)]' : 'text-[var(--color-text)]'
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
          <div className="p-4 border-t border-[var(--color-border)] flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-[16px] text-[13px] font-medium text-[var(--color-text)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50 transition-colors"
            >
              {loadingMore && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} />}
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
