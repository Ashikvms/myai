/**
 * Google Calendar two-way sync.
 *
 * Pull:  Calendar → GoogleCalendarEvent + Appointment (for new events).
 * Push:  Appointment → Google Calendar event (creates or updates).
 *
 * Conflict resolution is last-write-wins:
 *   - If a local Appointment's `updatedAt` > the linked
 *     `GoogleCalendarEvent.syncedAt`, we push the local state to Google.
 *   - Otherwise we trust whatever Calendar returned during the pull.
 *
 * Test mode: callers can pass `calendarOverride` to inject a mock
 * Calendar API surface, avoiding the need to stub the whole googleapis
 * import.
 */

import { calendar as calendarApi, type calendar_v3 } from '@googleapis/calendar';
import type { OAuth2Client } from 'google-auth-library';
import { logger } from '../config/logger';
import { prisma } from '../config/prisma';
import {
  getGoogleClient,
  classifyGoogleError,
  hasCalendarScope,
} from './google-oauth';

// ── Types ──────────────────────────────────────────────────────────

/**
 * Minimal subset of the calendar_v3.Calendar client surface that this
 * module touches. Letting tests pass a tiny mock instead of the real
 * gigantic generated type.
 */
export interface CalendarClientLike {
  events: {
    list: (params: calendar_v3.Params$Resource$Events$List) => Promise<{
      data: calendar_v3.Schema$Events;
    }>;
    insert: (params: calendar_v3.Params$Resource$Events$Insert) => Promise<{
      data: calendar_v3.Schema$Event;
    }>;
    patch: (params: calendar_v3.Params$Resource$Events$Patch) => Promise<{
      data: calendar_v3.Schema$Event;
    }>;
    delete: (params: calendar_v3.Params$Resource$Events$Delete) => Promise<unknown>;
  };
}

export interface SyncOptions {
  /** Only pull events updated since this timestamp. */
  since?: Date;
  /** Test seam — inject a stubbed Calendar client. */
  calendarOverride?: CalendarClientLike;
  /** Default 'primary'. */
  calendarId?: string;
  /** Max events per page. */
  pageSize?: number;
  /** Hard cap on pages to prevent runaway loops. */
  maxPages?: number;
}

export interface SyncResult {
  fetched: number;
  upserted: number;
  appointmentsCreated: number;
  appointmentsUpdated: number;
  pushedToGoogle: number;
  pagesScanned: number;
}

// ── Helpers ────────────────────────────────────────────────────────

function buildCalendarClient(auth: OAuth2Client, override?: CalendarClientLike): CalendarClientLike {
  if (override) return override;
  // calendarApi returns a fully-typed client; we narrow to our interface.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return calendarApi({ version: 'v3', auth }) as unknown as CalendarClientLike;
}

/**
 * Normalise a Google event's start/end into a `{ start, end }` Date pair.
 *
 * Google represents:
 *   - timed events with `dateTime` (RFC3339)
 *   - all-day events with `date` (YYYY-MM-DD, no zone)
 *
 * For all-day events we anchor `start` at 00:00 UTC and `end` at the
 * provided end-date (which is exclusive in Calendar API semantics, so we
 * subtract a millisecond to make our local representation inclusive).
 */
function eventDates(event: calendar_v3.Schema$Event): { start: Date; end: Date } | null {
  const sStr = event.start?.dateTime ?? event.start?.date;
  const eStr = event.end?.dateTime ?? event.end?.date;
  if (!sStr || !eStr) return null;
  const start = new Date(sStr);
  let end = new Date(eStr);
  // Reject obviously-invalid dates instead of crashing downstream.
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  // For all-day events, Calendar API end is exclusive. Subtract 1ms so
  // our stored `endAt` aligns with how humans think about "ends today".
  if (event.start?.date && event.end?.date) {
    end = new Date(end.getTime() - 1);
  }
  return { start, end };
}

function summariseAttendees(event: calendar_v3.Schema$Event): unknown {
  if (!event.attendees) return null;
  return event.attendees.map((a) => ({
    email: a.email,
    displayName: a.displayName ?? undefined,
    responseStatus: a.responseStatus ?? undefined,
  }));
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Pull events from Google for a user, upsert local GoogleCalendarEvent
 * rows, and mirror NEW events as Appointments.
 *
 * Returns aggregate counts for logging/observability.
 */
export async function syncCalendarEvents(
  userId: string,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const calendarId = options.calendarId ?? 'primary';
  const pageSize = options.pageSize ?? 250;
  const maxPages = options.maxPages ?? 20;

  // Cheap guard: skip users who haven't granted the Calendar scope.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleScopes: true, googleCalendarLastSyncedAt: true },
  });
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }
  if (!hasCalendarScope(user.googleScopes)) {
    logger.info('syncCalendarEvents: user has no Calendar scope — skipping', { userId });
    return { fetched: 0, upserted: 0, appointmentsCreated: 0, appointmentsUpdated: 0, pushedToGoogle: 0, pagesScanned: 0 };
  }

  const auth = await getGoogleClient(userId);
  const cal = buildCalendarClient(auth, options.calendarOverride);

  const since = options.since ?? user.googleCalendarLastSyncedAt ?? undefined;
  const result: SyncResult = {
    fetched: 0,
    upserted: 0,
    appointmentsCreated: 0,
    appointmentsUpdated: 0,
    pushedToGoogle: 0,
    pagesScanned: 0,
  };

  let pageToken: string | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    let listResp;
    try {
      listResp = await cal.events.list({
        calendarId,
        maxResults: pageSize,
        singleEvents: true,
        orderBy: 'updated',
        showDeleted: false,
        updatedMin: since ? since.toISOString() : undefined,
        pageToken,
      });
    } catch (err) {
      throw classifyGoogleError(err);
    }

    const items = listResp.data.items ?? [];
    result.pagesScanned += 1;
    result.fetched += items.length;

    for (const event of items) {
      const googleEventId = event.id;
      if (!googleEventId) continue;
      const dates = eventDates(event);
      if (!dates) continue;

      const summary = (event.summary ?? '(no title)').slice(0, 500);
      const description = event.description ?? null;
      const location = event.location?.slice(0, 500) ?? null;
      const attendees = summariseAttendees(event);
      const etag = event.etag?.slice(0, 120) ?? null;

      // Look for an existing local row by (userId, googleEventId).
      const existing = await prisma.googleCalendarEvent.findUnique({
        where: { userId_googleEventId: { userId, googleEventId } },
        include: { appointment: true },
      });

      if (existing) {
        // Conflict resolution: if the linked appointment was edited
        // locally AFTER our last sync, push local to Google instead of
        // overwriting local from Google.
        if (
          existing.appointment &&
          existing.appointment.updatedAt > existing.syncedAt
        ) {
          try {
            await pushAppointmentToCalendar(existing.appointment.id, {
              calendarOverride: options.calendarOverride,
            });
            result.pushedToGoogle += 1;
            continue;
          } catch (err) {
            logger.warn('syncCalendarEvents: push-on-conflict failed — falling back to pull', {
              userId,
              appointmentId: existing.appointment.id,
              error: (err as Error).message,
            });
            // fall through to overwrite local with Google's state
          }
        }

        await prisma.googleCalendarEvent.update({
          where: { id: existing.id },
          data: {
            summary,
            description,
            startAt: dates.start,
            endAt: dates.end,
            location,
            attendees: attendees as never,
            etag,
            syncedAt: new Date(),
          },
        });

        if (existing.appointmentId) {
          await prisma.appointment.update({
            where: { id: existing.appointmentId },
            data: {
              title: summary.slice(0, 200),
              dateTime: dates.start,
              endTime: dates.end,
              location: location?.slice(0, 500) ?? null,
              notes: description,
            },
          });
          result.appointmentsUpdated += 1;
        }
        result.upserted += 1;
      } else {
        // New remote event — mirror into Appointments AND create the
        // GoogleCalendarEvent row in one transaction so we never end up
        // with a half-linked state.
        try {
          await prisma.$transaction(async (tx) => {
            const appt = await tx.appointment.create({
              data: {
                userId,
                title: summary.slice(0, 200),
                dateTime: dates.start,
                endTime: dates.end,
                location: location?.slice(0, 500) ?? null,
                notes: description,
                source: 'google_calendar',
                sourceRef: googleEventId.slice(0, 120),
              },
            });
            await tx.googleCalendarEvent.create({
              data: {
                userId,
                googleEventId,
                calendarId,
                summary,
                description,
                startAt: dates.start,
                endAt: dates.end,
                location,
                attendees: attendees as never,
                etag,
                appointmentId: appt.id,
              },
            });
          });
          result.appointmentsCreated += 1;
          result.upserted += 1;
        } catch (err) {
          // Unique constraint races (two concurrent syncs) are
          // expected; downgrade to info and continue.
          if ((err as { code?: string }).code === 'P2002') {
            logger.info('syncCalendarEvents: race on insert — skipping', {
              userId,
              googleEventId,
            });
            continue;
          }
          throw err;
        }
      }
    }

    pageToken = listResp.data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { googleCalendarLastSyncedAt: new Date() },
  });

  return result;
}

/**
 * Push a single BillBee Appointment to Google Calendar. Creates a new
 * Google event if one is not already linked; otherwise patches the
 * existing event.
 */
export async function pushAppointmentToCalendar(
  appointmentId: string,
  options: { calendarOverride?: CalendarClientLike; calendarId?: string } = {},
): Promise<{ googleEventId: string }> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { googleEvents: true },
  });
  if (!appt) {
    throw new Error(`Appointment ${appointmentId} not found`);
  }

  const user = await prisma.user.findUnique({
    where: { id: appt.userId },
    select: { googleScopes: true },
  });
  if (!user || !hasCalendarScope(user.googleScopes)) {
    throw new Error(`User ${appt.userId} has no Calendar scope — cannot push`);
  }

  const auth = await getGoogleClient(appt.userId);
  const cal = buildCalendarClient(auth, options.calendarOverride);
  const calendarId = options.calendarId ?? 'primary';

  const start = appt.dateTime;
  // Default end = start + 1 hour if not provided. Calendar API requires
  // a non-empty end.
  const end = appt.endTime ?? new Date(start.getTime() + 60 * 60 * 1000);

  const requestBody: calendar_v3.Schema$Event = {
    summary: appt.title,
    description: appt.notes ?? undefined,
    location: appt.location ?? undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };

  // Existing link? Patch the remote.
  const existingLink = appt.googleEvents[0];
  let resp: calendar_v3.Schema$Event;
  try {
    if (existingLink) {
      const { data } = await cal.events.patch({
        calendarId: existingLink.calendarId,
        eventId: existingLink.googleEventId,
        requestBody,
      });
      resp = data;
    } else {
      const { data } = await cal.events.insert({ calendarId, requestBody });
      resp = data;
    }
  } catch (err) {
    throw classifyGoogleError(err);
  }

  const googleEventId = resp.id;
  if (!googleEventId) {
    throw new Error('Google Calendar API returned an event without an id');
  }

  // Upsert the GoogleCalendarEvent row + relink.
  await prisma.googleCalendarEvent.upsert({
    where: { userId_googleEventId: { userId: appt.userId, googleEventId } },
    update: {
      summary: appt.title,
      description: appt.notes ?? null,
      startAt: start,
      endAt: end,
      location: appt.location ?? null,
      etag: resp.etag?.slice(0, 120) ?? null,
      appointmentId: appt.id,
      syncedAt: new Date(),
    },
    create: {
      userId: appt.userId,
      googleEventId,
      calendarId,
      summary: appt.title,
      description: appt.notes ?? null,
      startAt: start,
      endAt: end,
      location: appt.location ?? null,
      etag: resp.etag?.slice(0, 120) ?? null,
      appointmentId: appt.id,
    },
  });

  return { googleEventId };
}

/**
 * Delete a Google event linked to a local Appointment. Used when the
 * user deletes the appointment from BillBee.
 */
export async function deleteAppointmentFromCalendar(
  appointmentId: string,
  options: { calendarOverride?: CalendarClientLike } = {},
): Promise<{ deleted: boolean }> {
  const link = await prisma.googleCalendarEvent.findUnique({
    where: { appointmentId },
  });
  if (!link) return { deleted: false };

  try {
    const auth = await getGoogleClient(link.userId);
    const cal = buildCalendarClient(auth, options.calendarOverride);
    await cal.events.delete({
      calendarId: link.calendarId,
      eventId: link.googleEventId,
    });
  } catch (err) {
    // 404/410 on Google side = already gone. Don't fail the caller —
    // still clean up the local row.
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status !== 404 && status !== 410) {
      logger.warn('deleteAppointmentFromCalendar: Google API delete failed', {
        appointmentId,
        error: (err as Error).message,
      });
    }
  }

  await prisma.googleCalendarEvent.delete({ where: { id: link.id } });
  return { deleted: true };
}
