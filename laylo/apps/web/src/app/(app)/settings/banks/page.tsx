'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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

// ─── Status badge ────────────────────────────────────────────────────
const STATUS_STYLES: Record<
  PlaidItemStatus,
  { label: string; bg: string; text: string; icon: React.ElementType }
> = {
  ACTIVE: {
    label: 'Active',
    bg: 'bg-green-50 dark:bg-green-500/10',
    text: 'text-green-700 dark:text-green-400',
    icon: CheckCircle2,
  },
  LOGIN_REQUIRED: {
    label: 'Re-authenticate',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    icon: AlertTriangle,
  },
  ERROR: {
    label: 'Error',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-400',
    icon: AlertCircle,
  },
  DISCONNECTED: {
    label: 'Disconnected',
    bg: 'bg-gray-100 dark:bg-gray-700/40',
    text: 'text-gray-600 dark:text-gray-300',
    icon: AlertCircle,
  },
};

function StatusBadge({ status }: { status: PlaidItemStatus }) {
  const cfg = STATUS_STYLES[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────
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

// ─── Connect button ──────────────────────────────────────────────────
function ConnectBankButton({
  onLinked,
  onError,
}: {
  onLinked: () => void;
  onError: (msg: string) => void;
}) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      try {
        // Hand the public_token straight to the server — never persist it.
        // The institution may be null for sandbox quick-link cases.
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
        // Drop the link token so it can't leak via re-render or refs.
        setLinkToken(null);
        onLinked();
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Failed to link account';
        onError(msg);
      }
    },
    [onError, onLinked],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => {
      // user closed Plaid Link without finishing — drop token
      setLinkToken(null);
    },
  });

  // Auto-open Plaid Link as soon as we have a fresh token.
  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  const handleClick = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const { linkToken: t } = await createLinkToken();
      setLinkToken(t);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Could not start Plaid Link';
      onError(msg);
    } finally {
      setCreating(false);
    }
  }, [creating, onError]);

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      disabled={creating}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-purple-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/25 disabled:opacity-50"
    >
      {creating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Plus className="w-4 h-4" />
      )}
      Connect a bank
    </motion.button>
  );
}

// ─── Item row ────────────────────────────────────────────────────────
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
      className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-xl bg-white dark:bg-[#1A1A1A] border border-gray-200/60 dark:border-gray-700/30"
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
            className="w-10 h-10 rounded-xl object-contain bg-white border border-gray-200 dark:border-gray-700"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-purple-500 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {item.institutionName}
            </p>
            <StatusBadge status={item.status} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {accountsCount} {accountsCount === 1 ? 'account' : 'accounts'} ·{' '}
            Last sync {formatLastSync(item.lastSyncAt)}
          </p>
          {item.errorMessage && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
              {item.errorMessage}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSync(item.id)}
          disabled={busy.sync || item.status === 'DISCONNECTED'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {busy.sync ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Sync
        </button>
        <button
          onClick={() => onDisconnect(item.id)}
          disabled={busy.disconnect || item.status === 'DISCONNECTED'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 disabled:opacity-50 transition-colors"
        >
          {busy.disconnect ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          Disconnect
        </button>
      </div>
    </motion.div>
  );
}

// ─── Skeleton row ────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-5 rounded-xl bg-white dark:bg-[#1A1A1A] border border-gray-200/60 dark:border-gray-700/30">
      <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-3 w-56 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────
export default function BanksSettingsPage() {
  const [items, setItems] = useState<PlaidItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyByItem, setBusyByItem] = useState<
    Record<string, { sync?: boolean; disconnect?: boolean }>
  >({});

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listItems();
      setItems(data);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Could not load connected banks';
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
      setBusyByItem((prev) => ({
        ...prev,
        [id]: { ...prev[id], [key]: val },
      }));
    },
    [],
  );

  const handleSync = useCallback(
    async (id: string) => {
      setBusy(id, 'sync', true);
      try {
        await triggerSync(id);
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Sync failed';
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
          ? window.confirm(
              'Disconnect this bank? Your historical transactions stay, but no new data will sync.',
            )
          : true;
      if (!confirmed) return;
      setBusy(id, 'disconnect', true);
      try {
        await disconnectItem(id);
        await loadItems();
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : 'Disconnect failed';
        setError(msg);
      } finally {
        setBusy(id, 'disconnect', false);
      }
    },
    [loadItems, setBusy],
  );

  const isEmpty = useMemo(
    () => !loading && (!items || items.length === 0),
    [loading, items],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Settings
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-purple-500 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Connected banks
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Read-only Plaid connections. We never store your bank login.
              </p>
            </div>
          </div>
        </div>
        <ConnectBankButton onLinked={loadItems} onError={setError} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-sm text-rose-700 dark:text-rose-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-xs font-medium hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : isEmpty ? (
        <div className="rounded-2xl bg-white dark:bg-[#1A1A1A] border border-gray-200/60 dark:border-gray-700/30 p-10 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#6366F1]/10 flex items-center justify-center mb-3">
            <Building2 className="w-6 h-6 text-[#6366F1]" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            No banks connected yet
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            Connect a bank to automatically sync transactions and balances.
            Your credentials never touch our servers.
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
