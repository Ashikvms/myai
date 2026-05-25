'use client';

/**
 * InboxTriageCard — surfaces the daily inbox digest at the top of the dashboard.
 *
 * Inputs: the `inboxTriage` slice of /api/dashboard. The dashboard page
 * passes it through; rendering only happens when both `linked` and
 * `inboxTriage` are present (see dashboard/page.tsx).
 *
 * Layout:
 *   - Headline (display type)
 *   - "Must act" list (each row: from + subject + why + View in Gmail)
 *   - "FYI" — collapsible accordion
 *   - "Noise" small caption (X filtered)
 *   - Refresh button → POST /api/google/gmail/poll
 */
import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Inbox,
} from 'lucide-react';
import { HexFrame } from '@/components/layout/hex-frame';
import { pollGmail, type InboxTriage } from '@/lib/api/google';

interface Props {
  triage: InboxTriage;
}

function gmailLink(externalId: string): string {
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(externalId)}`;
}

export function InboxTriageCard({ triage }: Props) {
  const reduce = useReducedMotion();
  const [fyiOpen, setFyiOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await pollGmail();
      // The actual data refresh happens upstream (the dashboard refetches
      // when the user navigates back / on a SWR cycle). We give the button
      // a momentary spin to confirm the request landed.
      window.setTimeout(() => setRefreshing(false), 800);
    } catch {
      setRefreshing(false);
      setError('Hmm, sync stalled. Try again?');
    }
  };

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 lg:p-7 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <HexFrame size={40} fill="var(--color-accent-soft)">
            <Inbox
              className="w-5 h-5 text-[var(--color-accent)]"
              strokeWidth={1.75}
            />
          </HexFrame>
          <div>
            <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-accent-dim)]">
              Inbox triage
            </p>
            <h2 className="mt-0.5 text-[22px] leading-[28px] font-semibold text-[var(--color-text)]">
              {triage.headline}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh inbox triage"
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--color-border-strong)] px-3 h-8 text-[13px] leading-[18px] font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] flex-shrink-0"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
            strokeWidth={1.75}
          />
          Refresh
        </button>
      </div>

      {/* Must act */}
      {triage.mustAct.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[11px] leading-[14px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
            Must act ({triage.mustAct.length})
          </p>
          <ul className="space-y-2">
            {triage.mustAct.map((item) => (
              <li
                key={item.id}
                className="rounded-[16px] bg-[var(--color-surface-2)] p-4 border border-[var(--color-border)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-[18px] font-semibold text-[var(--color-text)] truncate">
                      {item.from}
                    </p>
                    <p className="text-[15px] leading-[22px] text-[var(--color-text)] mt-0.5 truncate">
                      {item.subject}
                    </p>
                    <p className="text-[13px] leading-[18px] text-[var(--color-text-muted)] mt-1.5">
                      {item.why}
                    </p>
                  </div>
                  <a
                    href={gmailLink(item.externalId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[13px] leading-[18px] font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] flex-shrink-0 mt-0.5"
                    aria-label={`Open ${item.subject} in Gmail`}
                  >
                    View
                    <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-[8px] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] leading-[18px] text-[var(--color-text-muted)]">
          All quiet. We&apos;ll buzz you when something needs attention.
        </p>
      )}

      {/* FYI accordion */}
      {triage.fyi.length > 0 && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setFyiOpen((v) => !v)}
            aria-expanded={fyiOpen}
            className="inline-flex items-center gap-2 text-[13px] leading-[18px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded-[8px] px-1"
          >
            <motion.span
              animate={{ rotate: fyiOpen ? 180 : 0 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              className="inline-flex"
            >
              <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.75} />
            </motion.span>
            FYI ({triage.fyi.length})
          </button>
          <AnimatePresence initial={false}>
            {fyiOpen && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.22 }}
                className="overflow-hidden mt-3 space-y-1.5"
              >
                {triage.fyi.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-baseline justify-between gap-3 text-[13px] leading-[18px]"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-[var(--color-text)]">
                        {item.from}
                      </span>{' '}
                      <span className="text-[var(--color-text-muted)] truncate">
                        — {item.subject}
                      </span>
                    </div>
                    <a
                      href={gmailLink(item.externalId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[11px] leading-[14px] font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] flex-shrink-0"
                    >
                      Open
                      <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
                    </a>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Noise caption */}
      {triage.noise > 0 && (
        <p className="mt-5 text-[11px] leading-[14px] text-[var(--color-text-subtle)]">
          Filtered {triage.noise} newsletter{triage.noise === 1 ? '' : 's'} and
          promo{triage.noise === 1 ? '' : 's'}.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 text-[13px] leading-[18px] text-[var(--color-danger)]"
        >
          {error}
        </p>
      )}
    </motion.section>
  );
}
