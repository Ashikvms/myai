'use client';

/**
 * Small inline badges that flag an item as Google-sourced.
 *
 * Two variants:
 *   - <GoogleSourceBadge />     — multi-colour "G" used next to Appointment titles
 *   - <GmailSourceBadge />      — envelope dot used next to Bill names
 *
 * Both render a tooltip via `title=` (matches the brief's "show a tooltip"
 * requirement without dragging in a tooltip library — consistent with how
 * the rest of the app uses native title attrs).
 */
import { Mail } from 'lucide-react';

export function GoogleSourceBadge({
  className,
  tooltip = 'Synced from Google Calendar',
}: {
  className?: string;
  tooltip?: string;
}) {
  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      role="img"
      className={[
        'inline-flex items-center justify-center w-4 h-4 rounded-full bg-white border border-[var(--color-border)] flex-shrink-0',
        className ?? '',
      ].join(' ')}
    >
      {/* Tiny "G" glyph — single-colour to stay legible at 16px on yellow.
          A four-colour Google G is illegible at this size. */}
      <svg
        width={10}
        height={10}
        viewBox="0 0 48 48"
        aria-hidden="true"
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
    </span>
  );
}

export function GmailSourceBadge({
  className,
  tooltip = 'Found in your inbox',
}: {
  className?: string;
  tooltip?: string;
}) {
  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      role="img"
      className={[
        'inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-accent-soft)] flex-shrink-0',
        className ?? '',
      ].join(' ')}
    >
      <Mail
        className="w-2.5 h-2.5 text-[var(--color-accent)]"
        strokeWidth={2}
      />
    </span>
  );
}
