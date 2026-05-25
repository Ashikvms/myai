/**
 * Shared types for the AI package's Gmail-integration functions.
 *
 * These describe the inputs Gmail handlers in apps/api pass to us, and
 * the structured outputs we return. Kept narrow and serialisable so the
 * API layer can persist them straight to Prisma without remapping.
 */

/**
 * Minimal Gmail message shape consumed by extraction + triage prompts.
 * The backend strips HTML, decodes base64, etc. before handing it over.
 *
 * `body` should already be plain text. We tolerate up to ~6KB per message;
 * callers should truncate longer bodies before passing them in.
 */
export interface GmailMessageInput {
  subject: string;
  fromAddress: string;
  body: string;
  receivedAt: Date;
}

// ── Bill extraction ─────────────────────────────────────────────────

export type BillingCycle = 'one-time' | 'monthly' | 'yearly' | 'unknown';

export type BillCategory =
  | 'utilities'
  | 'subscription'
  | 'rent'
  | 'insurance'
  | 'medical'
  | 'shopping'
  | 'food-delivery'
  | 'other';

export interface ExtractedBill {
  vendor: string;
  amount: number;
  currency: string;
  dueAt: Date | null;
  billingCycle: BillingCycle;
  category: BillCategory;
  /** 0-1; callers can drop low-confidence extractions. */
  confidence: number;
}

// ── Appointment extraction ──────────────────────────────────────────

export interface ExtractedAppointment {
  title: string;
  startAt: Date;
  endAt: Date | null;
  /** Physical address OR virtual meeting URL. Null if not specified. */
  location: string | null;
  /** True when the location is a Zoom/Meet/Teams/etc. URL. */
  virtual: boolean;
  /** Email addresses pulled from the message body / headers. */
  attendees: string[];
  notes: string | null;
  confidence: number;
}

// ── Inbox triage ────────────────────────────────────────────────────

export interface TriageMustActItem {
  subject: string;
  fromAddress: string;
  /** One short sentence explaining why it needs action today. */
  why: string;
  /** One short imperative phrase the user can act on. */
  suggestedAction: string;
}

export interface TriageFyiItem {
  subject: string;
  fromAddress: string;
  /** One-sentence summary of the message. */
  summary: string;
}

export interface InboxTriageSummary {
  /** Single sentence for the dashboard hero. */
  headline: string;
  /** Items needing a response or action today. Max 5. */
  mustAct: TriageMustActItem[];
  /** Read-only updates worth knowing. Max 8. */
  fyi: TriageFyiItem[];
  /** Count of marketing / newsletter / auto-generated messages. */
  noise: number;
}
