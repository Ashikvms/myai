'use client';

/**
 * GoogleConnectCard — Settings card for the Google account integration.
 *
 * Two states:
 *   1. NOT LINKED — explainer copy + big "Connect Google" CTA.
 *      Click → POST /api/google/link → follow `redirectUrl`.
 *   2. LINKED     — email + scope dots + "last synced" stamps + per-surface
 *      "Sync now" buttons + Disconnect (with confirm modal that warns the
 *      link goes but the synced rows stay).
 *
 * Lives on the Settings page above the 2x2 hub grid. Reads through the
 * typed wrappers in `lib/api/google.ts`; does its own fetch/loading/error
 * lifecycle (no react-query in scope here — matches the banking widgets).
 */

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Check,
  ChevronRight,
  RefreshCw,
  Unplug,
  X,
  AlertCircle,
} from 'lucide-react';
import { HexFrame } from '@/components/layout/hex-frame';
import {
  getGoogleStatus,
  startGoogleLink,
  syncCalendar,
  pollGmail,
  unlinkGoogle,
  type GoogleStatus,
  type GoogleScope,
} from '@/lib/api/google';
import { ApiError } from '@/lib/api';

// ─── Visual primitives reused from the Settings page ──────────────
// These mirror the local SectionCard / SectionHeading helpers in
// `apps/(app)/settings/page.tsx` so the new card sits flush with the
// existing 2×2 hub above it. We can't import those because they're
// page-local; copying the visual contract keeps that boundary clean.

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="rounded-[16px] bg-[var(--color-surface)] p-6 border border-[var(--color-border)]"
    >
      {children}
    </motion.div>
  );
}

// ─── Pretty scope labels ──────────────────────────────────────────

const SCOPE_LABEL: Record<GoogleScope, string> = {
  'calendar.readonly': 'Calendar — read only',
  'calendar.events': 'Calendar — events',
  'gmail.readonly': 'Gmail — read only',
  'gmail.metadata': 'Gmail — metadata',
};

// "Calendar" + "Gmail" surface dots — green when at least one matching
// scope is granted, dim otherwise. The brief asks for "status dots".
function ScopeSurface({
  name,
  active,
}: {
  name: 'Calendar' | 'Gmail';
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-block w-2 h-2 rounded-full"
        style={{
          background: active
            ? 'var(--color-success)'
            : 'var(--color-border-strong)',
        }}
      />
      <span className="text-[13px] leading-[18px] font-medium text-[var(--color-text)]">
        {name}
      </span>
      <span className="text-[13px] leading-[18px] text-[var(--color-text-muted)]">
        {active ? 'Connected' : 'Not granted'}
      </span>
    </div>
  );
}

// ─── Tiny inline toast ────────────────────────────────────────────
// Local-only. The brief asks for a toast on Sync; the global toast
// stack isn't wired yet so we render a transient inline pill that
// auto-dismisses (matches the dashboard's bee-speech-bubble pattern).

interface InlineToast {
  id: number;
  tone: 'success' | 'error';
  text: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatRelative(iso: string | null): string {
  if (!iso) return 'Never';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) {
    const m = Math.floor(diff / 60_000);
    return `${m}m ago`;
  }
  if (diff < 86_400_000) {
    const h = Math.floor(diff / 3_600_000);
    return `${h}h ago`;
  }
  const d = Math.floor(diff / 86_400_000);
  return `${d}d ago`;
}

function hasCalendar(scopes: GoogleScope[]): boolean {
  return scopes.some((s) => s === 'calendar.readonly' || s === 'calendar.events');
}

function hasGmail(scopes: GoogleScope[]): boolean {
  return scopes.some((s) => s === 'gmail.readonly' || s === 'gmail.metadata');
}

// ─── Component ────────────────────────────────────────────────────

export function GoogleConnectCard() {
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [syncingCal, setSyncingCal] = useState(false);
  const [syncingGmail, setSyncingGmail] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<InlineToast | null>(null);

  // Refetch the status on mount. We deliberately fail-soft: if the
  // backend isn't ready yet the card still renders the "not linked"
  // explainer so engineers can preview the UI end-to-end.
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await getGoogleStatus();
      setStatus(s);
    } catch (err) {
      // Treat 404 / network as "not linked yet" so the UI is usable
      // before the backend lands. Show a soft error only for genuine
      // 5xx / auth failures.
      if (err instanceof ApiError && err.status >= 500) {
        setError('Hmm, sync stalled. Try again?');
      }
      setStatus({
        linked: false,
        googleEmail: null,
        scopes: [],
        calendarLastSyncedAt: null,
        gmailLastPolledAt: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-dismiss inline toast after 3.5s.
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const onConnect = async () => {
    setLinking(true);
    setError(null);
    try {
      const { redirectUrl } = await startGoogleLink();
      // The OAuth flow lives on Google's domain — full navigation.
      window.location.href = redirectUrl;
    } catch (err) {
      setLinking(false);
      setError(
        err instanceof ApiError
          ? 'Hmm, sync stalled. Try again?'
          : 'Lost the buzz. Check your connection.',
      );
    }
  };

  const onSyncCalendar = async () => {
    setSyncingCal(true);
    try {
      await syncCalendar();
      setToast({ id: Date.now(), tone: 'success', text: 'Calendar sync started 🐝' });
      // Best-effort refresh after a short delay so the user sees the
      // updated "last synced" stamp once the job completes.
      window.setTimeout(refresh, 1500);
    } catch {
      setToast({ id: Date.now(), tone: 'error', text: 'Hmm, sync stalled. Try again?' });
    } finally {
      setSyncingCal(false);
    }
  };

  const onSyncGmail = async () => {
    setSyncingGmail(true);
    try {
      await pollGmail();
      setToast({ id: Date.now(), tone: 'success', text: 'Inbox poll queued 🐝' });
      window.setTimeout(refresh, 1500);
    } catch {
      setToast({ id: Date.now(), tone: 'error', text: 'Hmm, sync stalled. Try again?' });
    } finally {
      setSyncingGmail(false);
    }
  };

  const onUnlink = async () => {
    setUnlinking(true);
    try {
      await unlinkGoogle();
      setConfirmOpen(false);
      setToast({ id: Date.now(), tone: 'success', text: 'Disconnected. Your synced data stays.' });
      await refresh();
    } catch {
      setToast({ id: Date.now(), tone: 'error', text: 'Hmm, sync stalled. Try again?' });
    } finally {
      setUnlinking(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────

  return (
    <CardShell>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Hex-clipped wordmark tile — gold accent surface, identical
              treatment to the other Settings section headings */}
          <HexFrame size={40} fill="var(--color-accent-soft)">
            <GoogleGlyph />
          </HexFrame>
          <div>
            <h2 className="text-[22px] leading-[28px] font-semibold text-[var(--color-text)]">
              Google Account
            </h2>
            <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)]">
              {status?.linked
                ? 'Calendar and inbox are humming.'
                : 'Sync your calendar both ways and let BillBee triage your inbox.'}
            </p>
          </div>
        </div>
        {status?.linked && (
          <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--color-accent-soft)] px-2.5 py-1 text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text)]">
            <Check className="w-3 h-3" strokeWidth={2.5} />
            Linked
          </span>
        )}
      </div>

      {loading && <LoadingRow />}

      {!loading && !status?.linked && (
        <NotLinkedState
          onConnect={onConnect}
          linking={linking}
          error={error}
        />
      )}

      {!loading && status?.linked && (
        <LinkedState
          status={status}
          syncingCal={syncingCal}
          syncingGmail={syncingGmail}
          onSyncCalendar={onSyncCalendar}
          onSyncGmail={onSyncGmail}
          onUnlinkClick={() => setConfirmOpen(true)}
          error={error}
        />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            role="status"
            aria-live="polite"
            className={`mt-4 inline-flex items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] leading-[18px] font-medium ${
              toast.tone === 'success'
                ? 'bg-[var(--color-accent-soft)] text-[var(--color-text)]'
                : 'bg-[var(--color-surface-2)] text-[var(--color-danger)]'
            }`}
          >
            {toast.tone === 'error' && (
              <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
            )}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmOpen && (
          <DisconnectConfirmModal
            onCancel={() => setConfirmOpen(false)}
            onConfirm={onUnlink}
            busy={unlinking}
          />
        )}
      </AnimatePresence>
    </CardShell>
  );
}

// ─── Sub-views ────────────────────────────────────────────────────

function LoadingRow() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 py-2"
    >
      <span className="inline-block w-4 h-4 rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-accent)] animate-spin" />
      <span className="text-[13px] leading-[18px] text-[var(--color-text-muted)]">
        Hang on, organising your hive…
      </span>
    </div>
  );
}

function NotLinkedState({
  onConnect,
  linking,
  error,
}: {
  onConnect: () => void;
  linking: boolean;
  error: string | null;
}) {
  const bullets = [
    'Sync your calendar both ways',
    'Auto-detect bills from your inbox',
    'Daily inbox summary — only the stuff that matters',
  ];
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onConnect}
        disabled={linking}
        className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] px-5 h-11 text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
      >
        {linking ? (
          <>
            <span className="inline-block w-4 h-4 rounded-full border-2 border-[var(--color-text-on-accent)]/30 border-t-[var(--color-text-on-accent)] animate-spin" />
            Off to Google…
          </>
        ) : (
          <>
            <GoogleGlyph small />
            Connect Google
          </>
        )}
      </button>

      <ul className="space-y-2.5">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2.5 text-[15px] leading-[22px] text-[var(--color-text)]"
          >
            <span
              aria-hidden="true"
              className="mt-2 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--color-accent)' }}
            />
            {b}
          </li>
        ))}
      </ul>

      {error && (
        <p
          role="alert"
          className="text-[13px] leading-[18px] text-[var(--color-danger)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function LinkedState({
  status,
  syncingCal,
  syncingGmail,
  onSyncCalendar,
  onSyncGmail,
  onUnlinkClick,
  error,
}: {
  status: GoogleStatus;
  syncingCal: boolean;
  syncingGmail: boolean;
  onSyncCalendar: () => void;
  onSyncGmail: () => void;
  onUnlinkClick: () => void;
  error: string | null;
}) {
  const calendarOn = hasCalendar(status.scopes);
  const gmailOn = hasGmail(status.scopes);
  return (
    <div className="space-y-5">
      {/* Email + checkmark */}
      {status.googleEmail && (
        <div className="flex items-center gap-2 rounded-[8px] bg-[var(--color-surface-2)] px-3 py-2">
          <Check
            className="w-4 h-4 text-[var(--color-success)] flex-shrink-0"
            strokeWidth={2.5}
          />
          <span className="text-[15px] leading-[22px] font-medium text-[var(--color-text)] truncate">
            {status.googleEmail}
          </span>
        </div>
      )}

      {/* Scope summary — two surface dots */}
      <div className="space-y-2">
        <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
          What we have access to
        </p>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-6">
          <ScopeSurface name="Calendar" active={calendarOn} />
          <ScopeSurface name="Gmail" active={gmailOn} />
        </div>
        {status.scopes.length > 0 && (
          <p className="text-[11px] leading-[14px] text-[var(--color-text-subtle)]">
            {status.scopes.map((s) => SCOPE_LABEL[s]).join(' · ')}
          </p>
        )}
      </div>

      {/* Last-synced + per-surface sync buttons */}
      <div className="space-y-3">
        <SyncRow
          label="Calendar"
          stamp={status.calendarLastSyncedAt}
          busy={syncingCal}
          onClick={onSyncCalendar}
          disabled={!calendarOn}
        />
        <SyncRow
          label="Gmail"
          stamp={status.gmailLastPolledAt}
          busy={syncingGmail}
          onClick={onSyncGmail}
          disabled={!gmailOn}
        />
      </div>

      {/* Disconnect */}
      <div className="pt-2 border-t border-[var(--color-border)]">
        <button
          type="button"
          onClick={onUnlinkClick}
          className="inline-flex items-center gap-2 rounded-[16px] border border-[var(--color-border-strong)] px-4 h-10 text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        >
          <Unplug className="w-4 h-4" strokeWidth={1.75} />
          Disconnect Google
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="text-[13px] leading-[18px] text-[var(--color-danger)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function SyncRow({
  label,
  stamp,
  busy,
  onClick,
  disabled,
}: {
  label: string;
  stamp: string | null;
  busy: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[13px] leading-[18px] font-medium text-[var(--color-text)]">
          {label}
        </p>
        <p className="text-[11px] leading-[14px] text-[var(--color-text-subtle)]">
          Last synced {formatRelative(stamp)}
        </p>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy || disabled}
        className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-strong)] px-3 h-8 text-[13px] leading-[18px] font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`}
          strokeWidth={1.75}
        />
        {busy ? 'Syncing…' : 'Sync now'}
      </button>
    </div>
  );
}

function DisconnectConfirmModal({
  onCancel,
  onConfirm,
  busy,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.15 }}
        onClick={busy ? undefined : onCancel}
        className="fixed inset-0 z-50 bg-[var(--color-overlay)] backdrop-blur-sm"
      />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pointer-events-none">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: reduce ? 0 : 0.22, ease: [0.4, 0, 0.2, 1] }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-unlink-title"
          className="relative mt-[12vh] w-full max-w-[440px] bg-[var(--color-surface)] rounded-[16px] border border-[var(--color-border-strong)] shadow-lg pointer-events-auto"
        >
          <div className="flex items-start justify-between gap-3 p-5 border-b border-[var(--color-border)]">
            <div>
              <h3
                id="google-unlink-title"
                className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)]"
              >
                Send Google out of the hive?
              </h3>
              <p className="mt-1 text-[13px] leading-[18px] text-[var(--color-text-muted)]">
                BillBee will stop syncing your calendar and inbox. Anything
                already imported (events, bills) stays.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              aria-label="Close"
              className="p-1 rounded-[8px] text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
          <div className="flex items-center justify-end gap-2 p-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="px-4 h-10 rounded-[16px] text-[13px] leading-[18px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-danger)] text-white text-[13px] leading-[18px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            >
              {busy ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Disconnecting…
                </>
              ) : (
                <>
                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Disconnect
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ─── Google "G" glyph ────────────────────────────────────────────
// Geometric flat reproduction of the four-colour "G" — small enough
// that we don't pull a logo asset. Same proportions Google uses on
// the official sign-in button.

function GoogleGlyph({ small = false }: { small?: boolean }) {
  const size = small ? 16 : 20;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Google"
    >
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}
