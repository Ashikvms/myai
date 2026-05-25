'use client';

/**
 * GmailBillsList — Gmail-detected bill-style messages.
 *
 * Pulls /api/google/gmail/messages?category=bill and renders a tidy list with
 * sender, subject, amount (if parsed), and a "View in Gmail" link. Same
 * loading/empty/error contract as CalendarEventsList.
 */
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ExternalLink, Mail, CheckCircle2 } from 'lucide-react';
import { BeeEnvelope } from '@/components/illustrations/bee';
import { HexFrame } from '@/components/layout/hex-frame';
import {
  listGmailMessages,
  type GmailMessage,
  type GmailMessageCategory,
} from '@/lib/api/google';
import { ApiError } from '@/lib/api';

interface Props {
  category?: GmailMessageCategory;
  limit?: number;
}

function gmailLink(externalId: string): string {
  // Gmail's universal "open thread by id" deep link. Works in browser
  // and the native Gmail apps.
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(externalId)}`;
}

function formatAmount(cents: number | null, currency: string | null): string | null {
  if (cents == null) return null;
  const value = cents / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency ?? 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export function GmailBillsList({ category = 'bill', limit = 8 }: Props) {
  const [messages, setMessages] = useState<GmailMessage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listGmailMessages(category)
      .then((res) => {
        if (cancelled) return;
        setMessages(res.messages);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status >= 500) {
          setError('Hmm, sync stalled. Try again?');
        }
        setMessages([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  if (loading) return <SkeletonRows />;
  if (error) return <ErrorState text={error} />;
  if (!messages || messages.length === 0) return <EmptyMessages />;

  return (
    <ul className="space-y-2">
      {messages.slice(0, limit).map((m) => {
        const amount = formatAmount(m.amountCents, m.currency);
        return (
          <li
            key={m.id}
            className="flex items-start gap-3 rounded-[8px] bg-[var(--color-surface-2)] p-3"
          >
            <HexFrame size={28} fill="var(--color-surface)">
              <Mail
                className="w-3.5 h-3.5 text-[var(--color-accent)]"
                strokeWidth={1.75}
              />
            </HexFrame>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 justify-between">
                <p className="text-[13px] leading-[18px] font-semibold text-[var(--color-text)] truncate">
                  {m.merchant ?? m.from}
                </p>
                {amount && (
                  <p className="text-[13px] leading-[18px] font-semibold tabular-nums text-[var(--color-text)] flex-shrink-0">
                    {amount}
                  </p>
                )}
              </div>
              <p className="text-[11px] leading-[14px] text-[var(--color-text-muted)] truncate">
                {m.subject}
              </p>
              <p className="text-[11px] leading-[14px] text-[var(--color-text-subtle)] tabular-nums mt-0.5">
                {format(new Date(m.receivedAt), 'MMM d')}
                {m.convertedToBill && (
                  <span className="ml-2 inline-flex items-center gap-0.5 text-[var(--color-success)]">
                    <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                    Saved as bill
                  </span>
                )}
              </p>
            </div>
            <a
              href={gmailLink(m.externalId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] leading-[14px] font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] flex-shrink-0"
              aria-label={`Open ${m.subject} in Gmail`}
            >
              Open
              <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

// ─── States ─────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <ul role="status" aria-live="polite" className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className="h-[64px] rounded-[8px] bg-[var(--color-surface-2)] animate-pulse"
        />
      ))}
      <span className="sr-only">Following the honey trail…</span>
    </ul>
  );
}

function EmptyMessages() {
  return (
    <div className="flex flex-col items-center text-center py-8">
      <BeeEnvelope size={96} />
      <p className="mt-3 text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
        Nothing buzzing in the inbox yet
      </p>
      <p className="mt-1 text-[13px] leading-[18px] text-[var(--color-text-muted)]">
        BillBee will surface bills the moment they land.
      </p>
    </div>
  );
}

function ErrorState({ text }: { text: string }) {
  return (
    <div
      role="alert"
      className="rounded-[8px] bg-[var(--color-surface-2)] p-4 text-[13px] leading-[18px] text-[var(--color-danger)]"
    >
      {text}
    </div>
  );
}
