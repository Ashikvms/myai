/**
 * Resource API helpers — thin typed wrappers around the BillBee API.
 *
 * Each call unwraps the standard `{ success, data }` envelope so
 * consumers (and React Query) work with the `data` payload directly.
 */
import { api } from '../api';
import type { ApiEnvelope } from './types';

// ─── Dashboard ─────────────────────────────────────────────────────

export interface DashboardConnectedAccount {
  id: string;
  institutionName: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  currentBalance: number | null;
  isoCurrencyCode: string;
}

export interface DashboardRecentTransaction {
  id: string;
  date: string;
  name: string;
  merchantName: string | null;
  amount: number;
  isoCurrencyCode: string;
  category: string | null;
  accountId: string;
  accountName: string;
  pending: boolean;
}

export interface DashboardTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
}

export interface DashboardBill {
  id: string;
  name: string;
  amount: number | string;
  nextDueDate: string;
  category: string | null;
  frequency: string;
  status: string;
  autopay: boolean;
}

export interface DashboardData {
  pendingTasks: number;
  todayTasks: DashboardTask[];
  billsDueSoon: DashboardBill[];
  totalMonthlyBills: number;
  totalMonthlySubs: number;
  activeSubscriptions: number;
  upcomingAppointments: unknown[];
  pendingReminders: number;
  expiringDocuments: unknown[];
  recentDocuments: unknown[];
  connectedAccounts: {
    count: number;
    totalBalance: number;
    totalDebt: number;
    accounts: DashboardConnectedAccount[];
  };
  recentTransactions: DashboardRecentTransaction[];
}

export function getDashboard(): Promise<DashboardData> {
  return api
    .get<ApiEnvelope<DashboardData>>('/api/dashboard')
    .then((r) => r.data);
}

// ─── Tasks ─────────────────────────────────────────────────────────

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ApiTask {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  category: string | null;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export function listTasks(): Promise<ApiTask[]> {
  return api.get<ApiEnvelope<ApiTask[]>>('/api/tasks').then((r) => r.data);
}

export function completeTask(id: string): Promise<ApiTask> {
  return api
    .put<ApiEnvelope<ApiTask>>(`/api/tasks/${encodeURIComponent(id)}/complete`)
    .then((r) => r.data);
}

export function uncompleteTask(id: string): Promise<ApiTask> {
  return api
    .put<ApiEnvelope<ApiTask>>(`/api/tasks/${encodeURIComponent(id)}`, {
      status: 'PENDING',
    })
    .then((r) => r.data);
}

// ─── Bills + Subscriptions ─────────────────────────────────────────

export type BillFrequency =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUALLY';

export interface ApiBill {
  id: string;
  userId: string;
  name: string;
  amount: number | string;
  frequency: BillFrequency;
  nextDueDate: string;
  category: string | null;
  status: string;
  autopay: boolean;
  /**
   * Provenance — backend sets this to 'gmail' when the bill was
   * auto-detected from a Gmail message. Used by the mobile UI to
   * render the small "📧" badge next to the bill name. May be
   * undefined for older records.
   */
  source?: 'manual' | 'gmail' | 'plaid' | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSubscription {
  id: string;
  userId: string;
  name: string;
  amount: number | string;
  frequency: BillFrequency;
  nextDueDate?: string;
  renewalDate?: string;
  category: string | null;
  status: string;
  autopay: boolean;
  createdAt: string;
  updatedAt: string;
}

export function listBills(): Promise<ApiBill[]> {
  return api.get<ApiEnvelope<ApiBill[]>>('/api/bills').then((r) => r.data);
}

export function listSubscriptions(): Promise<ApiSubscription[]> {
  return api
    .get<ApiEnvelope<ApiSubscription[]>>('/api/subscriptions')
    .then((r) => r.data);
}

// ─── Documents / Reminders / Appointments ──────────────────────────

export interface ApiDocument {
  id: string;
  title: string;
  category: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  expirationDate: string | null;
  createdAt: string;
}

export interface ApiReminder {
  id: string;
  title: string;
  dueAt: string;
  status: 'PENDING' | 'DISMISSED' | 'COMPLETED';
  recurring: boolean;
  recurrenceRule: string | null;
  linkedType: string | null;
  linkedId: string | null;
}

export interface ApiAppointment {
  id: string;
  title: string;
  dateTime: string;
  endTime?: string | null;
  location: string | null;
  category: string | null;
  reminderMinutes: number | null;
  notes: string | null;
  /**
   * Provenance — backend sets this to 'google' when the appointment
   * was synced from Google Calendar. Mobile renders a small "G"
   * badge next to the title. May be undefined for older records.
   */
  source?: 'manual' | 'google' | null;
  /** Direct link back to Google Calendar (only when source === 'google'). */
  externalUrl?: string | null;
}

export function listDocuments(): Promise<ApiDocument[]> {
  return api
    .get<ApiEnvelope<ApiDocument[]>>('/api/documents')
    .then((r) => r.data);
}

export function listReminders(): Promise<ApiReminder[]> {
  return api
    .get<ApiEnvelope<ApiReminder[]>>('/api/reminders')
    .then((r) => r.data);
}

export function dismissReminder(id: string): Promise<ApiReminder> {
  return api
    .put<ApiEnvelope<ApiReminder>>(`/api/reminders/${encodeURIComponent(id)}`, {
      status: 'DISMISSED',
    })
    .then((r) => r.data);
}

export function listAppointments(): Promise<ApiAppointment[]> {
  return api
    .get<ApiEnvelope<ApiAppointment[]>>('/api/appointments')
    .then((r) => r.data);
}

// ─── AI ────────────────────────────────────────────────────────────

export interface AiChatResponse {
  conversationId: string;
  userMessage: { id: string; role: string; content: string; createdAt: string };
  assistantMessage: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  };
}

export function askAi(
  message: string,
  conversationId?: string,
): Promise<AiChatResponse> {
  return api
    .post<ApiEnvelope<AiChatResponse>>('/api/ai/chat', {
      message,
      ...(conversationId ? { conversationId } : {}),
    })
    .then((r) => r.data);
}

// ─── Google Calendar + Gmail ──────────────────────────────────────
//
// Mirror of `apps/web/.../google/*`. The mobile flow uses the
// authorization-code-with-PKCE pattern via `expo-auth-session`:
//   1. POST /api/google/link/start          → { redirectUrl, state }
//   2. Open redirectUrl in WebBrowser
//   3. App captures lifeadminai://google-oauth?code=...&state=...
//   4. POST /api/google/link/callback { code, state } → { ok: true }
//   5. Refetch /api/google/status
//
// `inboxTriage` is the bee's daily Gmail digest — surfaced on the
// dashboard when present. Shape mirrors what the web component reads.

/**
 * Granular OAuth scopes mirrored from `apps/web/src/lib/api/google.ts`.
 * Web and mobile use the same canonical identifiers so a chip labeled
 * "Calendar" on web and mobile is keyed off the same string.
 */
export type GoogleScope =
  | 'calendar.readonly'
  | 'calendar.events'
  | 'gmail.readonly'
  | 'gmail.metadata';

/**
 * Convenience grouping the UI uses to render the two scope chips
 * (Calendar / Gmail). Returns true when *any* scope in the group is
 * granted — Google's consent screen lets users grant subset.
 */
export function hasCalendarScope(scopes: GoogleScope[]): boolean {
  return scopes.some((s) => s.startsWith('calendar'));
}
export function hasGmailScope(scopes: GoogleScope[]): boolean {
  return scopes.some((s) => s.startsWith('gmail'));
}

export interface GoogleStatus {
  linked: boolean;
  googleEmail: string | null;
  /** Granted scopes — same shape as the web client. */
  scopes: GoogleScope[];
  calendarLastSyncedAt: string | null;
  gmailLastPolledAt: string | null;
  /** Optional triage summary (only present if Gmail scope is granted). */
  inboxTriage?: GoogleInboxTriage | null;
}

export interface GoogleInboxTriageItem {
  id: string;
  /** Display name of the sender ("Acme Bank" not "noreply@acme.com"). */
  from: string;
  subject: string;
  /** Short AI-generated rationale: "Why this matters". */
  why: string;
  /** External Gmail id for the "View in Gmail" link. */
  externalId: string;
  receivedAt: string;
}

export interface GoogleInboxTriage {
  /** Display-type headline, e.g. "3 things to act on, 5 to skim". */
  headline: string;
  mustAct: GoogleInboxTriageItem[];
  fyi: GoogleInboxTriageItem[];
  /** Count of newsletters / promos filtered out. */
  noise: number;
}

export interface GoogleCalendarEvent {
  id: string;
  externalId: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  htmlLink: string;
  readOnly: boolean;
  calendarName: string;
}

export type GmailMessageCategory =
  | 'bill'
  | 'receipt'
  | 'subscription'
  | 'other';

export interface GmailMessage {
  id: string;
  externalId: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  category: GmailMessageCategory;
  amountCents: number | null;
  currency: string | null;
  merchant: string | null;
  convertedToBill: boolean;
}

export interface GoogleLinkStart {
  redirectUrl: string;
  /**
   * CSRF token mobile passes back to /link/callback.
   *
   * NOTE: web's `/api/google/link` returns only `{ redirectUrl }`
   * because the browser flow uses a server-side cookie for the CSRF
   * check. The mobile flow doesn't have that cookie — so we ask the
   * server for the state token explicitly via the same endpoint
   * (server-side branch keyed off the Accept header / a query flag
   * like `mode=mobile`). If the backend hasn't shipped this branch
   * yet, `state` may be empty — the OAuth helper handles that.
   */
  state: string;
}

export interface GoogleSyncJob {
  jobId: string;
}

/**
 * Helper — turn a Gmail externalId into the canonical web URL the
 * mobile Linking.openURL() call uses. Mirrors web's gmailLink().
 */
export function gmailMessageUrl(externalId: string): string {
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(externalId)}`;
}

export function getGoogleStatus(): Promise<GoogleStatus> {
  return api
    .get<ApiEnvelope<GoogleStatus>>('/api/google/status')
    .then((r) => r.data);
}

/**
 * Start an OAuth link. We pass `?mode=mobile` so the backend knows
 * to surface the `state` token in the JSON response (web reads it
 * from a server-set cookie that the native client can't see).
 */
export function startGoogleLink(): Promise<GoogleLinkStart> {
  return api
    .post<ApiEnvelope<GoogleLinkStart>>('/api/google/link?mode=mobile', {})
    .then((r) => r.data);
}

/**
 * Exchange the OAuth code for tokens. Mobile-only endpoint — the web
 * flow uses the server's redirect handler instead of an explicit
 * callback POST.
 */
export function completeGoogleLink(input: {
  code: string;
  state: string;
}): Promise<{ ok: true }> {
  return api
    .post<ApiEnvelope<{ ok: true }>>('/api/google/link/callback', input)
    .then((r) => r.data);
}

export function unlinkGoogle(): Promise<{ ok: true }> {
  return api
    .post<ApiEnvelope<{ ok: true }>>('/api/google/unlink', {})
    .then((r) => r.data);
}

export function syncGoogleCalendar(): Promise<GoogleSyncJob> {
  return api
    .post<ApiEnvelope<GoogleSyncJob>>('/api/google/calendar/sync', {})
    .then((r) => r.data);
}

export function pollGmail(): Promise<GoogleSyncJob> {
  return api
    .post<ApiEnvelope<GoogleSyncJob>>('/api/google/gmail/poll', {})
    .then((r) => r.data);
}

export function listGoogleCalendarEvents(params?: {
  since?: string;
}): Promise<{ events: GoogleCalendarEvent[] }> {
  const qs = params?.since
    ? `?since=${encodeURIComponent(params.since)}`
    : '';
  return api
    .get<ApiEnvelope<{ events: GoogleCalendarEvent[] }>>(
      `/api/google/calendar/events${qs}`,
    )
    .then((r) => r.data);
}

export function listGmailMessages(
  category: GmailMessageCategory = 'bill',
): Promise<{ messages: GmailMessage[] }> {
  return api
    .get<ApiEnvelope<{ messages: GmailMessage[] }>>(
      `/api/google/gmail/messages?category=${encodeURIComponent(category)}`,
    )
    .then((r) => r.data);
}

/**
 * Bills + Appointments may be Gmail/Calendar-sourced. The backend
 * adds a `source` field to indicate provenance; mobile reads it to
 * show the small badge ("📧" / "G") on cards.
 */
export type ResourceSource = 'manual' | 'gmail' | 'google' | 'plaid';
