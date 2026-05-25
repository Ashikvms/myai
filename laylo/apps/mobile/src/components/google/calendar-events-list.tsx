/**
 * CalendarEventsList — Google Calendar preview surface.
 *
 * Used inside the Settings panel (under the GoogleConnectCard) and
 * also referenced by future appointment-import flows. Pulls events
 * via /api/google/calendar/events?since=ISO and renders a compact
 * vertical stack with date + title + location + "Open in Google"
 * deep link.
 *
 * The list is intentionally read-only — actual import into
 * BillBee's appointments table happens via the syncGoogleCalendar
 * server job. This view is the "what's coming in" preview.
 */
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { radius, spacing, useTokens, type Tokens } from '../../lib/tokens';
import {
  listGoogleCalendarEvents,
  type GoogleCalendarEvent,
} from '../../lib/api/resources';
import { BeeStanding } from '../illustrations/bee';

function formatEventTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export interface CalendarEventsListProps {
  /** ISO timestamp to filter from. Defaults to "now". */
  since?: string;
  /** Optional cap on rendered rows. */
  limit?: number;
}

export function CalendarEventsList({
  since,
  limit = 10,
}: CalendarEventsListProps) {
  const t = useTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const sinceIso = since ?? new Date().toISOString();

  const eventsQuery = useQuery({
    queryKey: ['google', 'calendar', sinceIso],
    queryFn: () => listGoogleCalendarEvents({ since: sinceIso }),
    retry: false,
  });

  if (eventsQuery.isLoading) {
    return (
      <View style={styles.stateBox}>
        <ActivityIndicator color={t.accent} />
        <Text style={styles.helper}>Hang on, organising your hive…</Text>
      </View>
    );
  }

  if (eventsQuery.isError) {
    return (
      <View style={styles.stateBox}>
        <Text style={styles.errorText}>Hmm, sync stalled. Try again?</Text>
      </View>
    );
  }

  const events: GoogleCalendarEvent[] = (
    eventsQuery.data?.events ?? []
  ).slice(0, limit);

  if (events.length === 0) {
    return (
      <View style={styles.stateBox}>
        <BeeStanding size={80} />
        <Text style={styles.emptyTitle}>Calendar&apos;s clear.</Text>
        <Text style={styles.helper}>
          We&apos;ll buzz you when something lands.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {events.map((evt) => (
        <TouchableOpacity
          key={evt.id}
          style={styles.row}
          activeOpacity={0.8}
          onPress={() => {
            if (evt.htmlLink) {
              void Linking.openURL(evt.htmlLink);
            }
          }}
        >
          <View style={styles.dot} />
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {evt.title}
            </Text>
            <Text style={styles.rowMeta} numberOfLines={1}>
              {formatEventTime(evt.startsAt)}
              {evt.location ? ` · ${evt.location}` : ''}
            </Text>
          </View>
          {evt.htmlLink ? <Text style={styles.openHint}>Open ›</Text> : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function makeStyles(t: Tokens) {
  return StyleSheet.create({
    container: {
      backgroundColor: t.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.accent,
      marginTop: 2,
    },
    rowBody: { flex: 1 },
    rowTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: t.text,
    },
    rowMeta: {
      marginTop: 2,
      fontSize: 12,
      color: t.textMuted,
    },
    openHint: {
      fontSize: 12,
      fontWeight: '600',
      color: t.text,
    },
    stateBox: {
      backgroundColor: t.surface,
      borderRadius: radius.md,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: t.border,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: t.text,
    },
    helper: {
      fontSize: 12,
      color: t.textMuted,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 13,
      color: t.danger,
      fontWeight: '500',
      textAlign: 'center',
    },
  });
}
