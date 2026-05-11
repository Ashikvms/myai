'use client';

/**
 * Banks settings — REDESIGN_BRIEF.md §2.8.
 * - Indigo replaced with semantic gold tokens.
 * - Plaid behaviour preserved exactly.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  RefreshCw,
  Trash2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  Banknote,
} from 'lucide-react';
import {
  usePlaidLink,
  type PlaidLinkOnSuccess,
  type PlaidLinkOnSuccessMetadata,
} from 'react-plaid-link';
import {
  createLinkToken,
  disconnectItem,
  exchangePublicToken,
  listItems,
  triggerSync,
} from '@/lib/api/plaid';
import type { PlaidItem, PlaidItemStatus } from '@/lib/api/types';
import { ApiError } from '@/lib/api';
import { BeeStanding } from '@/components/illustrations/bee';
import { BeeSpeechBubble } from '@/components/motion/bee-speech-bubble';

// ─── Status badge ────────────────────────────────────────────────────
const STATUS_STYLES: Record<
  PlaidItemStatus,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'muted'; icon: React.ElementType }
> = {
  ACTIVE: { label: 'Active', tone: 'success', icon: CheckCircle2 },
  LOGIN_REQUIRED: { label: 'Re-authenticate', tone: 'warning', icon: AlertTriangle },
  ERROR: { label: 'Error', tone: 'danger', icon: AlertCircle },
  DISCONNECTED: { label: 'Disconnected', tone: 'muted', icon: AlertCircle },
};

const TONE_TEXT: Record<'success' | 'warning' | 'danger' | 'muted', string> = {
  success: 'text-[var(--color-success)]',
  warning: 'text-[var(--color-warning)]',
  danger: 'text-[var(--color-danger)]',
  muted: 'text-[var(--color-text-muted)]',
};

function StatusBadge({ status }: { status: PlaidItemStatus }) {
  const cfg = STATUS_STYLES[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[11px] leading-[14px] font-semibold uppercase tracking-wider bg-[var(--color-surface-2)] ${TONE_TEXT[cfg.tone]}`}
    >
      <Icon className="w-3 h-3" strokeWidth={1.75} />
      {cfg.label}
    </span>
  );
}

function formatLastSync(iso: string | null): string {
  if (!iso) return 'Never synced';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never synced';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function ConnectBankButton({
  onLinked,
  onError,
}: {
  onLinked: () => void;
  onError: (msg: string) => void;
}) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Bee wave: shown briefly before Plaid Link launches.
  const [waving, setWaving] = useState(false);
  useEffect(() => {
    if (!waving) return;
    const t = window.setTimeout(() => setWaving(false), 1800);
    return () => window.clearTimeout(t);
  }, [waving]);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      try {
        const institution = metadata.institution;
        if (!institution) {
          onError('Institution metadata missing from Plaid response');
          return;
        }
        await exchangePublicToken({
          publicToken,
          institutionId: institution.institution_id,
          institutionName: institution.name,
          accounts: metadata.accounts.map((a) => ({
            id: a.id,
            name: a.name,
            mask: a.mask,
            type: a.type,
            subtype: a.subtype,
          })),
        });
        setLinkToken(null);
        onLinked();
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Failed to link account';
        onError(msg);
      }
    },
    [onError, onLinked],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => {
      setLinkToken(null);
    },
  });

  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  const handleClick = useCallback(async () => {
    if (creating) return;
    setWaving(true);
    setCreating(true);
    try {
      const { linkToken: t } = await createLinkToken();
      setLinkToken(t);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Couldn't open the connection — try once more?";
      onError(msg);
    } finally {
      setCreating(false);
    }
  }, [creating, onError]);

  return (
    <div className="relative inline-flex items-center gap-3">
      {waving && (
        <div className="hidden sm:block">
          <BeeSpeechBubble tail="right" ariaLabel="Bee says: warming up your bank link">
            One sec — getting it ready 🐝
          </BeeSpeechBubble>
        </div>
      )}
      <button
        onClick={handleClick}
        disabled={creating}
        className="inline-flex items-center gap-2 px-4 h-10 rounded-[16px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[15px] font-medium text-[var(--color-text-on-accent)] transition-colors disabled:opacity-50"
      >
        {creating ? (
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} />
        ) : (
          <Plus className="w-4 h-4" strokeWidth={1.75} />
        )}
        Connect a bank
      </button>
    </div>
  );
}

function ItemRow({
  item,
  onSync,
  onDisconnect,
  busy,
}: {
  item: PlaidItem;
  onSync: (id: string) => void;
  onDisconnect: (id: string) => void;
  busy: { sync?: boolean; disconnect?: boolean };
}) {
  const accountsCount = item.accounts?.length ?? 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center gap-4 p-6 rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)]"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {item.institutionLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={
              item.institutionLogo.startsWith('http')
                ? item.institutionLogo
                : `data:image/png;base64,${item.institutionLogo}`
            }
            alt=""
            className="w-10 h-10 rounded-[8px] object-contain bg-white border border-[var(--color-border)]"
          />
        ) : (
          <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[16px] leading-[22px] font-semibold text-[var(--color-text)] truncate">
              {item.institutionName}
            </p>
            <StatusBadge status={item.status} />
          </div>
          <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] mt-1">
            {accountsCount} {accountsCount === 1 ? 'account' : 'accounts'} · Last sync {formatLastSync(item.lastSyncAt)}
          </p>
          {item.errorMessage && (
            <p className="text-[11px] leading-[14px] text-[var(--color-danger)] mt-1">{item.errorMessage}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSync(item.id)}
          disabled={busy.sync || item.status === 'DISCONNECTED'}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[16px] text-[13px] font-medium text-[var(--color-text)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50 transition-colors"
        >
          {busy.sync ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
          )}
          Sync
        </button>
        <button
          onClick={() => onDisconnect(item.id)}
          disabled={busy.disconnect || item.status === 'DISCONNECTED'}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[16px] text-[13px] font-medium text-[var(--color-danger)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50 transition-colors"
        >
          {busy.disconnect ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
          ) : (
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
          )}
          Disconnect
        </button>
      </div>
    </motion.div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-6 rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)]">
      <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 rounded-[8px] bg-[var(--color-surface-2)] animate-pulse" />
        <div className="h-3 w-56 rounded-[8px] bg-[var(--color-surface-2)] animate-pulse" />
      </div>
    </div>
  );
}

export default function BanksSettingsPage() {
  const [items, setItems] = useState<PlaidItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyByItem, setBusyByItem] = useState<Record<string, { sync?: boolean; disconnect?: boolean }>>({});

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listItems();
      setItems(data);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Hmm, something stung. Try again?';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const setBusy = useCallback(
    (id: string, key: 'sync' | 'disconnect', val: boolean) => {
      setBusyByItem((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
    },
    [],
  );

  const handleSync = useCallback(
    async (id: string) => {
      setBusy(id, 'sync', true);
      try {
        await triggerSync(id);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Hmm, sync stalled. Try again?";
        setError(msg);
      } finally {
        setBusy(id, 'sync', false);
      }
    },
    [setBusy],
  );

  const handleDisconnect = useCallback(
    async (id: string) => {
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm("Send this one out of the hive? Historical transactions stay — we just stop syncing new ones.")
          : true;
      if (!confirmed) return;
      setBusy(id, 'disconnect', true);
      try {
        await disconnectItem(id);
        await loadItems();
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Couldn't disconnect just now. Give it another go?";
        setError(msg);
      } finally {
        setBusy(id, 'disconnect', false);
      }
    },
    [loadItems, setBusy],
  );

  const isEmpty = useMemo(() => !loading && (!items || items.length === 0), [loading, items]);

  return (
    <div className="mx-auto max-w-[720px]">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-[13px] leading-[18px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-4"
      >
        <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
        Back to Settings
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
              <Banknote className="w-5 h-5 text-[var(--color-accent)]" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-[32px] leading-[40px] font-bold text-[var(--color-text)]">Connected banks</h1>
              <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)] mt-1">
                Read-only Plaid connections. We never store your bank login.
              </p>
            </div>
          </div>
        </div>
        <ConnectBankButton onLinked={loadItems} onError={setError} />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-[8px] bg-[var(--color-surface)] border-l-4 border-[var(--color-danger)] text-[13px] text-[var(--color-danger)] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-[11px] font-medium hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : isEmpty ? (
        <div className="rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-12 flex flex-col items-center text-center">
          <BeeStanding size={96} />
          <h3 className="mt-4 text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
            Connect a bank — we&apos;ll handle the honey trail.
          </h3>
          <p className="mt-2 max-w-md text-[15px] leading-[22px] text-[var(--color-text-muted)]">
            Sync transactions and balances automatically. Your credentials never touch our servers.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items?.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onSync={handleSync}
              onDisconnect={handleDisconnect}
              busy={busyByItem[item.id] || {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
