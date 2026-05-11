'use client';

/**
 * TransactionDetailDrawer — Item 28 Phase 3a (Web Frontend).
 *
 * A right-side slide-over panel that opens when a transaction row is
 * clicked. Loads enriched detail (`GET /api/transactions/:id`), supports
 * note editing (`PATCH /api/transactions/:id/note`), and a gold "Help me
 * understand this" affordance that calls the AI explainer
 * (`POST /api/ai/explain-transaction/:id`).
 *
 * Design notes (DESIGN_SYSTEM + LAYOUT_REDESIGN_BRIEF):
 * - Two radii only: 8 px (chips/inputs) + 16 px (cards/sheet).
 * - Body text NEVER gold; gold is reserved for accents + the AI button.
 * - Spring 320/28 for slide-in; backdrop fades 200 ms.
 * - `useReducedMotion()` collapses motion to opacity fades only.
 */
import * as React from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  Check,
  CreditCard,
  Loader2,
  MapPin,
  Paperclip,
  Repeat,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  explainTransaction,
  getTransactionDetail,
  updateTransactionNote,
} from '@/lib/api/transactions';
import type {
  TransactionDetail,
  TransactionDetailResponse,
  TransactionExplainResponse,
  TransactionPattern,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api';

interface TransactionDetailDrawerProps {
  transactionId: string | null;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  } catch {
    return `$${Math.abs(amount).toFixed(2)}`;
  }
}

function humanizeCategory(input: string | null): string | null {
  if (!input) return null;
  // Plaid PFC: SCREAMING_SNAKE_CASE → "Title Case With &"
  return input
    .toLowerCase()
    .split('_')
    .map((part) => {
      if (part === 'and') return '&';
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function formatWhen(iso: string, timeAvailable: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dateStr = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  if (!timeAvailable) return dateStr;
  // Plaid `date` is yyyy-mm-dd (no time). When the API includes a real
  // datetime we can show "at 7:42 AM" — for now fall through to dateStr.
  const hasClock = /T\d{2}:\d{2}/.test(iso);
  if (!hasClock) return dateStr;
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${dateStr} at ${timeStr}`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function paymentChannelLabel(channel: string | null): string | null {
  if (!channel) return null;
  const c = channel.toLowerCase();
  if (c === 'in store' || c === 'in_store') return 'In store';
  if (c === 'online') return 'Online';
  if (c === 'other') return 'Other';
  return channel;
}

// ─── Subcomponents ───────────────────────────────────────────────

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        'rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-4',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </section>
  );
}

function CardHeading({
  icon: Icon,
  children,
}: {
  // Lucide exports ref-forwarding components; `React.ElementType` keeps
  // the prop signature open without TS fighting the LucideProps shape.
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <h3 className="text-[13px] leading-[18px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-2 flex items-center gap-1.5">
      {Icon && (
        <Icon
          className="w-3.5 h-3.5 text-[var(--color-text-subtle)]"
          strokeWidth={1.75}
        />
      )}
      {children}
    </h3>
  );
}

function MerchantAvatar({
  logoUrl,
  name,
  size = 48,
}: {
  logoUrl: string | null;
  name: string;
  size?: number;
}) {
  const [errored, setErrored] = React.useState(false);
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  if (logoUrl && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        onError={() => setErrored(true)}
        className="rounded-[8px] bg-[var(--color-surface-2)] object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-text-muted)] font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

// ─── Drawer body (rendered when data loaded) ─────────────────────

function DrawerBody({
  detail,
  pattern,
  transactionId,
}: {
  detail: TransactionDetail;
  pattern: TransactionPattern;
  transactionId: string;
}) {
  const isInflow = detail.amount < 0;
  const formattedAmount = formatCurrency(detail.amount, detail.isoCurrencyCode);

  // Location formatting — skip card entirely if nothing useful.
  const locationParts = [
    detail.isoLocationCity,
    detail.isoLocationRegion,
    detail.isoLocationCountry,
  ].filter((p): p is string => Boolean(p && p.trim().length > 0));
  const hasLocation = locationParts.length > 0;
  const channelLabel = paymentChannelLabel(detail.paymentChannel);
  const showWhereCard = Boolean(channelLabel) || hasLocation;

  // Pattern card — hide if only one transaction at this merchant ever.
  const showPatternCard = pattern.txCount > 1;

  // Note autosave (debounced on blur).
  const [note, setNote] = React.useState(detail.userNote ?? '');
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [noteError, setNoteError] = React.useState<string | null>(null);
  const lastSavedRef = React.useRef<string>(detail.userNote ?? '');

  React.useEffect(() => {
    setNote(detail.userNote ?? '');
    lastSavedRef.current = detail.userNote ?? '';
  }, [detail.id, detail.userNote]);

  const saveNote = React.useCallback(async () => {
    const trimmed = note.trim();
    if (trimmed === lastSavedRef.current.trim()) return;
    setSaving(true);
    setNoteError(null);
    try {
      const next = trimmed.length > 0 ? trimmed : null;
      const res = await updateTransactionNote(transactionId, next);
      lastSavedRef.current = res.userNote ?? '';
      setSavedAt(Date.now());
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Hmm, couldn't save that note. Try again?";
      setNoteError(msg);
    } finally {
      setSaving(false);
    }
  }, [note, transactionId]);

  // AI explainer state.
  const [explainLoading, setExplainLoading] = React.useState(false);
  const [explainResult, setExplainResult] =
    React.useState<TransactionExplainResponse | null>(null);
  const [explainError, setExplainError] = React.useState<string | null>(null);

  const handleExplain = React.useCallback(async () => {
    if (explainLoading) return;
    setExplainLoading(true);
    setExplainError(null);
    try {
      const res = await explainTransaction(transactionId);
      setExplainResult(res);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Couldn't load that explanation. Try again?";
      setExplainError(msg);
    } finally {
      setExplainLoading(false);
    }
  }, [explainLoading, transactionId]);

  // Receipt placeholder toast.
  const [receiptToast, setReceiptToast] = React.useState(false);
  React.useEffect(() => {
    if (!receiptToast) return;
    const t = setTimeout(() => setReceiptToast(false), 3000);
    return () => clearTimeout(t);
  }, [receiptToast]);

  const merchantDisplay = detail.merchantName || detail.name;
  const category = humanizeCategory(detail.category);
  const categoryDetailed = humanizeCategory(detail.categoryDetailed);
  const showAuthorized =
    detail.authorizedDate && detail.authorizedDate !== detail.date;

  const accountMaskLabel = detail.bankAccount.mask
    ? `···· ${detail.bankAccount.mask}`
    : '';

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <MerchantAvatar
          logoUrl={detail.merchantLogoUrl}
          name={merchantDisplay}
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-[22px] leading-[28px] font-semibold tracking-[-0.01em] text-[var(--color-text)] truncate">
            {merchantDisplay}
          </h2>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={[
                'text-[28px] leading-[34px] font-semibold tabular-nums',
                isInflow
                  ? 'text-[var(--color-success)]'
                  : 'text-[var(--color-text)]',
              ].join(' ')}
            >
              {isInflow ? '+' : '−'}
              {formattedAmount}
            </span>
            <span className="text-[13px] leading-[18px] text-[var(--color-text-subtle)]">
              {detail.isoCurrencyCode}
            </span>
            {detail.pending && (
              <span className="ml-1 text-[11px] leading-[14px] font-semibold uppercase tracking-[0.08em] px-2 py-0.5 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-warning)]">
                Pending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* When */}
      <Card>
        <CardHeading icon={Calendar}>When</CardHeading>
        <p className="text-[15px] leading-[23px] text-[var(--color-text)]">
          {formatWhen(detail.date, true)}
        </p>
        {showAuthorized && detail.authorizedDate && (
          <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] mt-1">
            Authorized {formatShortDate(detail.authorizedDate)}
          </p>
        )}
      </Card>

      {/* Where */}
      {showWhereCard && (
        <Card>
          <CardHeading icon={MapPin}>Where</CardHeading>
          {channelLabel && (
            <p className="text-[15px] leading-[23px] text-[var(--color-text)]">
              {channelLabel}
            </p>
          )}
          {hasLocation && (
            <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] mt-1">
              {locationParts.join(' · ')}
            </p>
          )}
        </Card>
      )}

      {/* Category */}
      {(category || categoryDetailed) && (
        <Card>
          <CardHeading icon={Tag}>Category</CardHeading>
          <div className="flex flex-wrap items-center gap-2">
            {category && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[var(--color-accent-soft)] text-[13px] leading-[18px] font-medium text-[var(--color-text)]">
                {category}
              </span>
            )}
            {categoryDetailed && categoryDetailed !== category && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-[8px] bg-[var(--color-surface-2)] text-[13px] leading-[18px] text-[var(--color-text-muted)]">
                {categoryDetailed}
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Bank */}
      <Card>
        <CardHeading icon={CreditCard}>Bank</CardHeading>
        <p className="text-[15px] leading-[23px] text-[var(--color-text)]">
          Charged to{' '}
          <span className="font-semibold">
            {detail.bankAccount.institutionName ?? 'your bank'}
          </span>{' '}
          {detail.bankAccount.name} {accountMaskLabel}
        </p>
      </Card>

      {/* AI Explainer */}
      <Card>
        <CardHeading icon={Sparkles}>Help me understand this</CardHeading>
        {!explainResult && !explainLoading && (
          <button
            type="button"
            onClick={handleExplain}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-on-accent)] text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
          >
            <Sparkles className="w-4 h-4" strokeWidth={1.75} />
            Help me understand this
          </button>
        )}
        {explainLoading && (
          <div className="flex items-center gap-2 text-[13px] leading-[18px] text-[var(--color-text-muted)]">
            <Loader2
              className="w-4 h-4 animate-spin text-[var(--color-accent)]"
              strokeWidth={1.75}
            />
            Asking BillBee…
          </div>
        )}
        {explainError && (
          <div className="flex items-start gap-2 text-[13px] leading-[18px] text-[var(--color-danger)]">
            <AlertCircle
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              strokeWidth={1.75}
            />
            <div className="flex-1">{explainError}</div>
            <button
              type="button"
              onClick={handleExplain}
              className="text-[13px] underline text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Retry
            </button>
          </div>
        )}
        {explainResult && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] leading-[14px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-subtle)]">
                BillBee says
              </span>
              {explainResult.mock && (
                <span className="text-[11px] leading-[14px] font-semibold px-1.5 py-0.5 rounded-[8px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                  preview
                </span>
              )}
            </div>
            <p className="text-[15px] leading-[23px] text-[var(--color-text)] whitespace-pre-wrap">
              {explainResult.explanation}
            </p>
            <button
              type="button"
              onClick={() => {
                setExplainResult(null);
                handleExplain();
              }}
              className="mt-3 text-[13px] leading-[18px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline"
            >
              Ask again
            </button>
          </div>
        )}
      </Card>

      {/* Notes */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <CardHeading>Notes</CardHeading>
          <AnimatePresence>
            {savedAt && !saving && (
              <motion.span
                key={savedAt}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-1 text-[11px] leading-[14px] font-semibold text-[var(--color-success)]"
                role="status"
              >
                <Check className="w-3 h-3" strokeWidth={2} />
                Saved
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => {
            void saveNote();
          }}
          placeholder="Add a note for future you…"
          rows={3}
          maxLength={2000}
          className="w-full rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25 focus:outline-none text-[15px] leading-[23px] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] p-3 resize-none"
        />
        {saving && (
          <p className="mt-1 text-[11px] leading-[14px] text-[var(--color-text-subtle)]">
            Saving…
          </p>
        )}
        {noteError && (
          <p className="mt-1 text-[11px] leading-[14px] text-[var(--color-danger)]">
            {noteError}
          </p>
        )}
      </Card>

      {/* Receipt */}
      <Card>
        <CardHeading icon={Paperclip}>Receipt</CardHeading>
        <button
          type="button"
          onClick={() => setReceiptToast(true)}
          className="inline-flex items-center gap-2 px-3 h-9 rounded-[8px] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-hover)] text-[13px] leading-[18px] font-medium text-[var(--color-text)] transition-colors"
          title="Receipt upload arrives in the next update"
        >
          <Paperclip className="w-4 h-4" strokeWidth={1.75} />
          Attach receipt
        </button>
        <AnimatePresence>
          {receiptToast && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              role="status"
              className="mt-2 text-[11px] leading-[14px] text-[var(--color-text-muted)]"
            >
              Receipt upload arrives in the next update.
            </motion.p>
          )}
        </AnimatePresence>
      </Card>

      {/* Pattern */}
      {showPatternCard && (
        <Card>
          <CardHeading icon={TrendingUp}>This month</CardHeading>
          <p className="text-[15px] leading-[23px] text-[var(--color-text)]">
            You’ve spent{' '}
            <span className="font-semibold tabular-nums">
              {formatCurrency(pattern.totalSpent, detail.isoCurrencyCode)}
            </span>{' '}
            at{' '}
            <span className="font-semibold">
              {pattern.merchantName || merchantDisplay}
            </span>{' '}
            this month ({pattern.txCount}{' '}
            {pattern.txCount === 1 ? 'visit' : 'visits'}, avg{' '}
            <span className="tabular-nums">
              {formatCurrency(pattern.avgAmount, detail.isoCurrencyCode)}
            </span>
            ).
          </p>
          {pattern.firstSeen && (
            <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] mt-1">
              First seen {formatShortDate(pattern.firstSeen)}
            </p>
          )}
        </Card>
      )}

      {/* Linked items */}
      {(detail.bill || detail.subscription) && (
        <Card>
          <CardHeading icon={Repeat}>Linked</CardHeading>
          <div className="flex flex-col gap-2">
            {detail.bill && (
              <a
                href="/bills"
                className="flex items-center justify-between rounded-[8px] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-hover)] px-3 py-2 transition-colors"
              >
                <span className="text-[15px] leading-[23px] text-[var(--color-text)]">
                  Bill: <span className="font-semibold">{detail.bill.name}</span>
                </span>
                <span className="text-[13px] leading-[18px] text-[var(--color-text-muted)] tabular-nums">
                  {formatCurrency(detail.bill.amount, detail.isoCurrencyCode)}
                </span>
              </a>
            )}
            {detail.subscription && (
              <a
                href="/subscriptions"
                className="flex items-center justify-between rounded-[8px] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-hover)] px-3 py-2 transition-colors"
              >
                <span className="text-[15px] leading-[23px] text-[var(--color-text)]">
                  Subscription:{' '}
                  <span className="font-semibold">
                    {detail.subscription.name}
                  </span>
                </span>
                <span className="text-[13px] leading-[18px] text-[var(--color-text-muted)] tabular-nums">
                  {formatCurrency(
                    detail.subscription.amount,
                    detail.isoCurrencyCode,
                  )}
                </span>
              </a>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Main exported component ─────────────────────────────────────

export function TransactionDetailDrawer({
  transactionId,
  onClose,
}: TransactionDetailDrawerProps) {
  const reduceMotion = useReducedMotion();
  const open = transactionId !== null;

  const [data, setData] = React.useState<TransactionDetailResponse | null>(
    null,
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch detail when id changes (and is non-null).
  React.useEffect(() => {
    if (!transactionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    getTransactionDetail(transactionId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? err.message
            : 'Could not load this transaction. Try again?';
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  // Esc closes.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll while open (matches modal behaviour elsewhere).
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-[var(--color-overlay)] backdrop-blur-sm"
          />

          {/* Gold "fwoosh" streak — leads the drawer in from the right edge.
              Friend micro-interaction (one-shot, ~280ms, then unmounts via AnimatePresence). */}
          {!reduceMotion && (
            <motion.div
              key="drawer-fwoosh"
              aria-hidden="true"
              initial={{ x: '110vw', opacity: 0 }}
              animate={{ x: '0vw', opacity: [0, 0.55, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
              className="pointer-events-none fixed top-0 right-0 z-[55] h-full w-[200px]"
              style={{
                background:
                  'linear-gradient(270deg, rgba(255,215,0,0.45) 0%, rgba(255,215,0,0) 100%)',
                willChange: 'transform, opacity',
              }}
            />
          )}

          {/* Panel */}
          <motion.aside
            key="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Transaction details"
            initial={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 320, damping: 28 }
            }
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[480px] bg-[var(--color-bg)] border-l border-[var(--color-border-strong)] shadow-[var(--shadow-lg)] overflow-y-auto"
          >
            {/* Sticky close button */}
            <div className="sticky top-0 z-10 flex items-center justify-between bg-[var(--color-bg)]/95 backdrop-blur-sm px-6 py-4 border-b border-[var(--color-border)]">
              <span className="text-[11px] leading-[14px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-subtle)]">
                Transaction
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-[8px] p-1 text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            {loading && (
              <div className="p-6 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[8px] bg-[var(--color-surface-2)] animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-2/3 rounded-[8px] bg-[var(--color-surface-2)] animate-pulse" />
                    <div className="h-7 w-1/3 rounded-[8px] bg-[var(--color-surface-2)] animate-pulse" />
                  </div>
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-[16px] bg-[var(--color-surface-2)] animate-pulse"
                  />
                ))}
              </div>
            )}

            {error && !loading && (
              <div className="p-6">
                <div className="flex items-start gap-2 p-4 rounded-[16px] bg-[var(--color-surface)] border-l-4 border-[var(--color-danger)] text-[13px] text-[var(--color-danger)]">
                  <AlertCircle
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    strokeWidth={1.75}
                  />
                  <div className="flex-1">
                    <p className="font-semibold mb-1">
                      Couldn’t load that transaction
                    </p>
                    <p className="text-[var(--color-text-muted)]">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {!loading && !error && data && transactionId && (
              <DrawerBody
                detail={data.transaction}
                pattern={data.pattern}
                transactionId={transactionId}
              />
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default TransactionDetailDrawer;
