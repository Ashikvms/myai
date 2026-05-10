'use client';

/**
 * Transactions — Day-Grouped Conversational Stack
 * (LAYOUT_REDESIGN_BRIEF §2.6).
 *
 * Kills the table feel. Sticky day header pill ("Today · Tue 28 Apr · $124.50
 * spent · $0 in") in h2; each row has a colored left-bar (gold-dim outflow,
 * green inflow) and a recurring-ring badge if matched to a sub/bill.
 * Single sticky filter bar at top; "Load more" → gold pill.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  AlertCircle,
  Loader2,
  Receipt,
  Search,
  Repeat,
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
import { AnimatedNumber } from '@/components/motion/animated-number';

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

function formatDayHeader(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (isSameDay(date, today)) return `Today · ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
  if (isSameDay(date, yesterday)) return `Yesterday · ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

const PAGE_SIZE = 50;

const FILTER_TABS = ['All', 'This month', 'Income', 'Expenses', 'Recurring'] as const;
type FilterTab = (typeof FILTER_TABS)[number];

export default function TransactionsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [accountId, setAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  const [items, setItems] = useState<Transaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const accountById = useMemo(() => {
    const map = new Map<string, BankAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  // Filter client-side for the segmented filter bar (server filters via baseQuery).
  const filteredItems = useMemo(() => {
    switch (activeFilter) {
      case 'Income':
        return items.filter((t) => toNumber(t.amount) < 0);
      case 'Expenses':
        return items.filter((t) => toNumber(t.amount) > 0);
      case 'Recurring':
        // Heuristic: subscription-like merchants. Without server-side flag, show all
        // items that have a category indicating a recurring payment.
        return items.filter((t) =>
          /netflix|spotify|gym|hulu|adobe|cloud|dropbox|prime/i.test(
            t.merchantName ?? t.name ?? '',
          ),
        );
      case 'This month':
        return items.filter((t) => {
          const d = new Date(t.date);
          const now = new Date();
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
      default:
        return items;
    }
  }, [items, activeFilter]);

  // Group by day
  const groups = useMemo(() => {
    const m = new Map<
      string,
      { date: Date; items: Transaction[]; spent: number; income: number }
    >();
    filteredItems.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      let g = m.get(key);
      if (!g) {
        g = {
          date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          items: [],
          spent: 0,
          income: 0,
        };
        m.set(key, g);
      }
      g.items.push(t);
      const amt = toNumber(t.amount);
      if (amt < 0) g.income += -amt;
      else g.spent += amt;
    });
    return Array.from(m.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  }, [filteredItems]);

  return (
    <div className="max-w-[840px] mx-auto">
      {/* Header */}
      <header className="mb-6">
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
      </header>

      {/* Sticky filter pill bar */}
      <div className="sticky top-16 z-20 bg-[var(--color-bg)]/95 backdrop-blur-sm py-3 -mx-4 px-4 mb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_TABS.map((tab) => {
            const active = activeFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`relative px-3 py-1.5 rounded-[8px] text-[13px] leading-[18px] font-medium transition-colors ${
                  active
                    ? 'text-[var(--color-text-on-accent)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="txn-active-tab"
                    className="absolute inset-0 bg-[var(--color-accent)] rounded-[8px]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            );
          })}
          <form onSubmit={handleSearchSubmit} className="relative ml-auto flex-1 min-w-[200px] max-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-subtle)]" strokeWidth={1.75} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search…"
              className="w-full pl-9 pr-3 py-1.5 rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
          </form>
        </div>
        {/* Date filter row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" className="px-2 py-1 text-[12px] rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)]" />
          <span className="text-[12px] text-[var(--color-text-subtle)]">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" className="px-2 py-1 text-[12px] rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)]" />
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="px-2 py-1 text-[12px] rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
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
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-[8px] bg-[var(--color-surface)] border-l-4 border-[var(--color-danger)] text-[13px] text-[var(--color-danger)] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-[16px] bg-[var(--color-surface-2)] animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filteredItems.length === 0 && (
        <div className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-12 flex flex-col items-center text-center">
          {q || activeFilter !== 'All' ? <BeeMagnifying size={96} /> : <BeeStanding size={96} />}
          <p className="mt-4 text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
            {q || activeFilter !== 'All'
              ? "Couldn't find anything"
              : 'Connect a bank to see what’s been flowing'}
          </p>
          <p className="mt-2 text-[13px] leading-[18px] text-[var(--color-text-muted)]">
            {q || activeFilter !== 'All'
              ? 'Try adjusting your filters or date range.'
              : 'Connect a bank in Settings → Banks to start syncing.'}
          </p>
        </div>
      )}

      {/* Day-grouped stack */}
      {!loading && filteredItems.length > 0 && (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.date.toISOString()}>
              <div className="sticky top-[140px] z-10 mb-2 bg-[var(--color-bg)]/95 backdrop-blur-sm py-2">
                <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-[16px] bg-[var(--color-surface-2)]">
                  <h2 className="text-[15px] leading-[22px] font-semibold text-[var(--color-text)]">
                    {formatDayHeader(g.date)}
                  </h2>
                  {g.spent > 0 && (
                    <span className="text-[13px] leading-[18px] font-medium tabular-nums text-[var(--color-text-muted)]">
                      <AnimatedNumber value={g.spent} prefix="$" decimals={2} /> spent
                    </span>
                  )}
                  {g.income > 0 && (
                    <span className="text-[13px] leading-[18px] font-medium tabular-nums text-[var(--color-success)]">
                      +<AnimatedNumber value={g.income} prefix="$" decimals={2} /> in
                    </span>
                  )}
                </div>
              </div>
              <ul className="space-y-2">
                {g.items.map((t) => {
                  const amt = toNumber(t.amount);
                  const isInflow = amt < 0;
                  const isRecurring = /netflix|spotify|gym|hulu|adobe|cloud|dropbox|prime/i.test(
                    t.merchantName ?? t.name ?? '',
                  );
                  const acct = accountById.get(t.bankAccountId) ?? t.bankAccount;
                  return (
                    <li
                      key={t.id}
                      className={`group relative flex items-center gap-3 rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] pl-4 pr-4 py-3 transition-colors hover:bg-[var(--color-surface-hover)] ${
                        t.pending ? 'opacity-60' : ''
                      }`}
                    >
                      {/* Colored left-bar */}
                      <div
                        aria-hidden="true"
                        className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r-full"
                        style={{
                          background: isInflow
                            ? 'var(--color-success)'
                            : 'var(--color-accent-dim)',
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] leading-[22px] font-semibold text-[var(--color-text)] truncate">
                          {t.merchantName || t.name}
                          {t.pending && (
                            <span className="ml-2 text-[11px] leading-[14px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-warning)]">
                              Pending
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] leading-[14px] text-[var(--color-text-subtle)] flex items-center gap-1.5 mt-0.5">
                          {t.category && <span>{t.category}</span>}
                          {acct && (
                            <>
                              <span>·</span>
                              <Building2 className="w-3 h-3" strokeWidth={1.75} />
                              <span className="truncate">
                                {acct.name}
                                {'mask' in acct && acct.mask ? ` ····${acct.mask}` : ''}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      {isRecurring && (
                        <span
                          className="hidden sm:flex items-center gap-1 text-[11px] leading-[14px] font-medium px-2 py-1 rounded-[8px] bg-[var(--color-accent-soft)] text-[var(--color-accent-dim)]"
                          title="Matched to a recurring sub or bill"
                        >
                          <Repeat className="w-3 h-3" strokeWidth={1.75} />
                          Recurring
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <AskAiChip
                            prompt="Why did this repeat?"
                            context={`Transaction: ${t.merchantName || t.name}, ${formatAmount(t.amount, t.isoCurrencyCode)}`}
                            iconOnly
                            label="Ask"
                          />
                        </span>
                        <span
                          className={`text-[16px] leading-[22px] font-semibold tabular-nums ${
                            isInflow ? 'text-[var(--color-success)]' : 'text-[var(--color-text)]'
                          }`}
                        >
                          {isInflow ? '+' : '−'}
                          {formatAmount(t.amount, t.isoCurrencyCode)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Load more — gold pill */}
      {!loading && nextCursor && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-5 h-10 rounded-[16px] text-[13px] font-semibold text-[var(--color-text-on-accent)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors"
          >
            {loadingMore && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} />}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
