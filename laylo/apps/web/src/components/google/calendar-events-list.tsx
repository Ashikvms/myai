'use client';

/**
 * CalendarEventsList — list of events freshly pulled from Google Calendar.
 *
 * Used on Settings (and any future "Google" detail surface) to confirm the
 * sync is actually returning rows. Keeps its own fetch/loading/error/empty
 * lifecycle so it can be dropped anywhere.
 *
 * Empty state ships a sleeping bee + "Calendar's clear. Enjoy the open hive."
 * (copy bank — BRAND_GUIDE.md §2).
 */
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ExternalLink, MapPin, CalendarDays } from 'lucide-react';
import { BeeSleeping } from '@/components/illustrations/bee';
import { HexFrame } from '@/components/layout/hex-frame';
import {
  listCalendarEvents,
  type GoogleCalendarEvent,
} from '@/lib/api/google';
import { ApiError } from '@/lib/api';

interface Props {
  /** ISO timestamp; defaults to "from now". */
  since?: string;
  /** Cap displayed rows; defaults to 8. */
  limit?: number;
}

export function CalendarEventsList({ since, limit = 8 }: Props) {
  const [events, setEvents] = useState<GoogleCalendarEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listCalendarEvents(since)
      .then((res) => {
        if (cancelled) return;
        setEvents(res.events);
      })
      .catch((err) => {
        if (cancelled) return;
        // Soft-fail on 404 → empty list (backend not ready).
        if (err instanceof ApiError && err.status >= 500) {
          setError('Hmm, sync stalled. Try again?');
        }
        setEvents([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [since]);

  if (loading) return <SkeletonRows />;
  if (error) return <ErrorState text={error} />;
  if (!events || events.length === 0) return <EmptyCalendar />;

  return (
    <ul className="space-y-2">
      {events.slice(0, limit).map((e) => (
        <li
          key={e.id}
          className="flex items-start gap-3 rounded-[8px] bg-[var(--color-surface-2)] p-3"
        >
          <HexFrame size={28} fill="var(--color-surface)">
            <CalendarDays
              className="w-3.5 h-3.5 text-[var(--color-accent)]"
              strokeWidth={1.75}
            />
          </HexFrame>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] leading-[18px] font-semibold text-[var(--color-text)] truncate">
              {e.title}
            </p>
            <p className="text-[11px] leading-[14px] text-[var(--color-text-subtle)] tabular-nums">
              {format(new Date(e.startsAt), 'EEE MMM d · h:mm a')}
              {e.endsAt ? ` – ${format(new Date(e.endsAt), 'h:mm a')}` : ''}
            </p>
            {e.location && (
              <p className="mt-1 flex items-center gap-1 text-[11px] leading-[14px] text-[var(--color-text-muted)]">
                <MapPin className="w-3 h-3 flex-shrink-0" strokeWidth={1.75} />
                <span className="truncate">{e.location}</span>
              </p>
            )}
          </div>
          <a
            href={e.htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] leading-[14px] font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] flex-shrink-0"
            aria-label={`Open ${e.title} in Google Calendar`}
          >
            Open
            <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
          </a>
        </li>
      ))}
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
          className="h-[60px] rounded-[8px] bg-[var(--color-surface-2)] animate-pulse"
        />
      ))}
      <span className="sr-only">Hang on, organising your hive…</span>
    </ul>
  );
}

function EmptyCalendar() {
  return (
    <div className="flex flex-col items-center text-center py-8">
      <BeeSleeping size={96} />
      <p className="mt-3 text-[16px] leading-[22px] font-semibold text-[var(--color-text)]">
        Calendar&apos;s clear. Enjoy the open hive.
      </p>
      <p className="mt-1 text-[13px] leading-[18px] text-[var(--color-text-muted)]">
        Anything you add to Google will show up here after the next sync.
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
