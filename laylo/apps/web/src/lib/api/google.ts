import { api } from '../api';
import type { ApiEnvelope } from './types';

// Google Calendar + Gmail typed client wrappers.
//
// Mirrors the contract documented in the Google integrations brief:
//   GET  /api/google/status
//   POST /api/google/link
//   POST /api/google/unlink
//   POST /api/google/calendar/sync
//   POST /api/google/gmail/poll
//   GET  /api/google/calendar/events?since=ISO
//   GET  /api/google/gmail/messages?category=bill
//
// All endpoints return the standard `{ success: true, data: <T> }` envelope
// used by every other client wrapper here (see plaid.ts / transactions.ts).
// Calls go through `api` (apps/web/src/lib/api.ts) which adds the Bearer
// token + handles ApiError surfacing.

// ─── Scopes ────────────────────────────────────────────────────────
// We model scopes as a discriminated union so the UI can switch on
// the canonical scope identifiers without parsing raw OAuth URLs.

export type GoogleScope =
  | 'calendar.readonly'
  | 'calendar.events'
  | 'gmail.readonly'
  | 'gmail.metadata';

// ─── Status ────────────────────────────────────────────────────────

export interface GoogleStatus {
  linked: boolean;
  googleEmail: string | null;
  scopes: GoogleScope[];
  calendarLastSyncedAt: string | null;
  gmailLastPolledAt: string | null;
}

export interface GoogleLinkStartResponse {
  redirectUrl: string;
}

export interface GoogleSyncJobResponse {
  jobId: string;
}

// ─── Calendar events ───────────────────────────────────────────────

export interface GoogleCalendarEvent {
  id: string;
  /** Google's external event id, useful for "View in Google Calendar" links. */
  externalId: string;
  title: string;
  /** ISO timestamp string. */
  startsAt: string;
  /** ISO timestamp string. Optional for all-day events. */
  endsAt: string | null;
  /** Free-text location (matches the field shown in Google Calendar). */
  location: string | null;
  /** A link the user can open in Google Calendar to see/edit the event. */
  htmlLink: string;
  /** True if the event came from a calendar the user doesn't own. */
  readOnly: boolean;
  /** Calendar name (e.g. "Personal", "Work"). */
  calendarName: string;
}

export interface GoogleCalendarEventsResponse {
  events: GoogleCalendarEvent[];
}

// ─── Gmail messages / bills ────────────────────────────────────────

export type GmailMessageCategory = 'bill' | 'receipt' | 'subscription' | 'other';

export interface GmailMessage {
  id: string;
  /** Gmail's external message id, used for "View in Gmail" deep links. */
  externalId: string;
  from: string;
  subject: string;
  /** Pre-rendered snippet from the body (≤ 200 chars). */
  snippet: string;
  /** ISO timestamp string of when the message was received. */
  receivedAt: string;
  category: GmailMessageCategory;
  /** Detected amount in cents if Gmail parsing surfaced one. */
  amountCents: number | null;
  currency: string | null;
  /** Detected merchant / payee. */
  merchant: string | null;
  /** Whether this message has already been converted into a Bill row. */
  convertedToBill: boolean;
}

export interface GmailMessagesResponse {
  messages: GmailMessage[];
}

// ─── Endpoints ─────────────────────────────────────────────────────

export function getGoogleStatus(): Promise<GoogleStatus> {
  return api
    .get<ApiEnvelope<GoogleStatus>>('/api/google/status')
    .then((r) => r.data);
}

export function startGoogleLink(): Promise<GoogleLinkStartResponse> {
  return api
    .post<ApiEnvelope<GoogleLinkStartResponse>>('/api/google/link', {})
    .then((r) => r.data);
}

export function unlinkGoogle(): Promise<{ ok: true }> {
  return api
    .post<ApiEnvelope<{ ok: true }>>('/api/google/unlink', {})
    .then((r) => r.data);
}

export function syncCalendar(): Promise<GoogleSyncJobResponse> {
  return api
    .post<ApiEnvelope<GoogleSyncJobResponse>>(
      '/api/google/calendar/sync',
      {},
    )
    .then((r) => r.data);
}

export function pollGmail(): Promise<GoogleSyncJobResponse> {
  return api
    .post<ApiEnvelope<GoogleSyncJobResponse>>(
      '/api/google/gmail/poll',
      {},
    )
    .then((r) => r.data);
}

export function listCalendarEvents(
  since?: string,
): Promise<GoogleCalendarEventsResponse> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : '';
  return api
    .get<ApiEnvelope<GoogleCalendarEventsResponse>>(
      `/api/google/calendar/events${qs}`,
    )
    .then((r) => r.data);
}

export function listGmailMessages(
  category: GmailMessageCategory = 'bill',
): Promise<GmailMessagesResponse> {
  return api
    .get<ApiEnvelope<GmailMessagesResponse>>(
      `/api/google/gmail/messages?category=${encodeURIComponent(category)}`,
    )
    .then((r) => r.data);
}

// ─── Dashboard inbox triage (lives under /api/dashboard, but shape
//     belongs with the rest of the Google surface) ─────────────────

export interface InboxTriageItem {
  id: string;
  /** Display name of the sender ("Acme Bank" not "noreply@acme.com"). */
  from: string;
  subject: string;
  /** A one-liner explaining why BillBee surfaced this email. */
  why: string;
  /** External Gmail id for the "View in Gmail" link. */
  externalId: string;
  receivedAt: string;
}

export interface InboxTriage {
  /** Display-type headline, e.g. "3 things to act on, 5 to skim". */
  headline: string;
  mustAct: InboxTriageItem[];
  fyi: InboxTriageItem[];
  /** Count of newsletters / promos filtered out. */
  noise: number;
}

// Slim slice of the dashboard payload we actually consume here. The
// backend returns more (existing widgets), but the page is still on
// demo data — this helper only pulls the Google-flavoured bits so we
// don't tie the new code to fields it doesn't render yet.
export interface DashboardGoogleSlice {
  inboxTriage?: InboxTriage;
}

export function getDashboardGoogleSlice(): Promise<DashboardGoogleSlice> {
  return api
    .get<ApiEnvelope<DashboardGoogleSlice>>('/api/dashboard')
    .then((r) => r.data ?? {});
}
