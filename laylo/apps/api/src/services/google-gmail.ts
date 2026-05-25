/**
 * Gmail polling + AI extraction.
 *
 * Responsibilities:
 *   - Poll the user's Gmail inbox (since last poll watermark) and upsert
 *     a row per message into `GmailMessage`. We store only minimal
 *     metadata + a snippet at this stage — full bodies are fetched on
 *     demand by `processGmailMessage`.
 *   - For each unprocessed message, fetch the body, run AI classification
 *     + extraction, and create downstream Bill / Appointment / Reminder
 *     rows tagged with `source: 'gmail'` and `sourceRef: <gmailMessageId>`.
 *   - Produce a daily inbox triage summary.
 *
 * AI integration: this service depends on three functions that the AI
 * prompts engineer is adding to `@life-admin/ai`. To avoid a hard import
 * cycle (their PR may land after this one), we look them up dynamically
 * and degrade gracefully if absent — we still persist the GmailMessage
 * row, just leave it unprocessed.
 */

import { gmail as gmailApi, type gmail_v1 } from '@googleapis/gmail';
import type { OAuth2Client } from 'google-auth-library';
import { Prisma, type BillFrequency } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../config/prisma';
import { getGoogleClient, classifyGoogleError, hasGmailScope } from './google-oauth';

// ── Types ──────────────────────────────────────────────────────────

export interface GmailClientLike {
  users: {
    messages: {
      list: (params: gmail_v1.Params$Resource$Users$Messages$List) => Promise<{
        data: gmail_v1.Schema$ListMessagesResponse;
      }>;
      get: (params: gmail_v1.Params$Resource$Users$Messages$Get) => Promise<{
        data: gmail_v1.Schema$Message;
      }>;
      modify: (params: gmail_v1.Params$Resource$Users$Messages$Modify) => Promise<unknown>;
    };
  };
}

export interface PollOptions {
  /** Test seam — inject a mock Gmail client. */
  gmailOverride?: GmailClientLike;
  /** Override the user-id we hit ('me' by default). */
  userIdOnGmail?: string;
  /** Cap on total messages fetched per run. */
  maxMessages?: number;
  /** Page size for messages.list. */
  pageSize?: number;
}

export interface PollResult {
  scanned: number;
  inserted: number;
  alreadyKnown: number;
  pages: number;
}

export interface ProcessResult {
  category: string | null;
  createdBillId?: string;
  createdAppointmentId?: string;
  createdReminderId?: string;
  /** True when the AI extension is not wired up yet — message stays unprocessed. */
  skipped?: boolean;
}

// ── Bridge to the AI service (loaded dynamically) ──────────────────

/**
 * Shape we expect from the @life-admin/ai package. We import LAZILY and
 * narrow each function before calling so the API still builds + runs
 * before the AI engineer's prompts land.
 */
interface GmailAiBridge {
  extractBillFromEmail: (input: { subject: string; body: string; fromAddress: string }) => Promise<{
    isBill: boolean;
    name?: string;
    amount?: number;
    nextDueDate?: string;
    frequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
    category?: string;
    confidence?: number;
  } | null>;
  extractAppointmentFromEmail: (input: { subject: string; body: string; fromAddress: string }) => Promise<{
    isAppointment: boolean;
    title?: string;
    dateTime?: string;
    endTime?: string;
    location?: string;
    notes?: string;
    confidence?: number;
  } | null>;
  classifyEmail: (input: { subject: string; body: string; fromAddress: string }) => Promise<{
    category: 'bill' | 'receipt' | 'appointment' | 'other';
    confidence?: number;
  } | null>;
  summarizeInboxTriage: (input: {
    emails: Array<{
      subject: string;
      fromAddress: string;
      snippet: string;
      receivedAt: string;
      category?: string | null;
    }>;
  }) => Promise<{ summary: string; highlights?: string[] } | null>;
}

let cachedBridge: GmailAiBridge | null | undefined;

async function loadAiBridge(): Promise<GmailAiBridge | null> {
  if (cachedBridge !== undefined) return cachedBridge;
  if (!env.ANTHROPIC_API_KEY) {
    cachedBridge = null;
    return null;
  }
  try {
    // Use a dynamic, opaque specifier so the bundler doesn't complain if
    // the named exports don't exist yet.
    const mod: Record<string, unknown> = await import('@life-admin/ai');
    const bridge: Partial<GmailAiBridge> = {};
    if (typeof mod.extractBillFromEmail === 'function') {
      bridge.extractBillFromEmail = mod.extractBillFromEmail as GmailAiBridge['extractBillFromEmail'];
    }
    if (typeof mod.extractAppointmentFromEmail === 'function') {
      bridge.extractAppointmentFromEmail = mod.extractAppointmentFromEmail as GmailAiBridge['extractAppointmentFromEmail'];
    }
    if (typeof mod.classifyEmail === 'function') {
      bridge.classifyEmail = mod.classifyEmail as GmailAiBridge['classifyEmail'];
    }
    if (typeof mod.summarizeInboxTriage === 'function') {
      bridge.summarizeInboxTriage = mod.summarizeInboxTriage as GmailAiBridge['summarizeInboxTriage'];
    }
    cachedBridge = (bridge.extractBillFromEmail && bridge.extractAppointmentFromEmail && bridge.classifyEmail
      ? (bridge as GmailAiBridge)
      : null);
    if (!cachedBridge) {
      logger.warn(
        'Gmail AI bridge unavailable — required functions missing from @life-admin/ai. ' +
          'Messages will be stored but not processed until the AI engineer ships the prompts.',
      );
    }
    return cachedBridge;
  } catch (err) {
    logger.warn('Failed to dynamically import @life-admin/ai', {
      error: (err as Error).message,
    });
    cachedBridge = null;
    return null;
  }
}

/** Test seam — reset the cached AI bridge between tests. */
export function _resetGmailAiBridgeCache(): void {
  cachedBridge = undefined;
}

// ── Gmail client + helpers ─────────────────────────────────────────

function buildGmailClient(auth: OAuth2Client, override?: GmailClientLike): GmailClientLike {
  if (override) return override;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return gmailApi({ version: 'v1', auth }) as unknown as GmailClientLike;
}

function headerValue(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string | null {
  if (!headers) return null;
  const target = name.toLowerCase();
  for (const h of headers) {
    if ((h.name ?? '').toLowerCase() === target) return h.value ?? null;
  }
  return null;
}

/**
 * Recursively flatten a Gmail message into a single decoded text body.
 * Prefers `text/plain` parts; falls back to stripping tags from
 * `text/html` if no plain part exists.
 */
function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';
  const collected: { plain: string[]; html: string[] } = { plain: [], html: [] };

  function walk(part: gmail_v1.Schema$MessagePart): void {
    if (part.parts && part.parts.length > 0) {
      for (const child of part.parts) walk(child);
      return;
    }
    const data = part.body?.data;
    if (!data) return;
    const decoded = Buffer.from(data, 'base64url').toString('utf8');
    if (part.mimeType === 'text/plain') {
      collected.plain.push(decoded);
    } else if (part.mimeType === 'text/html') {
      collected.html.push(decoded);
    }
  }
  walk(payload);

  if (collected.plain.length > 0) return collected.plain.join('\n').trim();
  if (collected.html.length > 0) {
    // Very simple tag stripper. We are NOT trying to render HTML — just
    // give the AI legible prose. The brief is fine with this.
    return collected.html
      .join('\n')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return '';
}

const MAX_BODY_CHARS = 12_000; // hard cap before sending to AI

// ── Public API ─────────────────────────────────────────────────────

/**
 * Pull recent message metadata from Gmail and upsert GmailMessage rows.
 * Does NOT trigger AI extraction; call `processGmailMessage` separately
 * (typically inside the same job loop).
 */
export async function pollGmail(userId: string, options: PollOptions = {}): Promise<PollResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleScopes: true, googleGmailLastPolledAt: true },
  });
  if (!user) throw new Error(`User ${userId} not found`);
  if (!hasGmailScope(user.googleScopes)) {
    logger.info('pollGmail: user has no Gmail scope — skipping', { userId });
    return { scanned: 0, inserted: 0, alreadyKnown: 0, pages: 0 };
  }

  const auth = await getGoogleClient(userId);
  const client = buildGmailClient(auth, options.gmailOverride);
  const ownerId = options.userIdOnGmail ?? 'me';
  const maxMessages = options.maxMessages ?? 100;
  const pageSize = Math.min(options.pageSize ?? 50, maxMessages);

  // Use Gmail's search syntax for an `after:` filter when we have a
  // watermark. The watermark precision is "epoch seconds", which is
  // exactly what Gmail expects.
  let q: string | undefined;
  if (user.googleGmailLastPolledAt) {
    const epochSec = Math.floor(user.googleGmailLastPolledAt.getTime() / 1000);
    q = `after:${epochSec} -in:chats -in:trash`;
  } else {
    // First poll — last 7 days only to avoid blowing through quotas.
    const cutoff = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    q = `after:${cutoff} -in:chats -in:trash`;
  }

  const result: PollResult = { scanned: 0, inserted: 0, alreadyKnown: 0, pages: 0 };
  let pageToken: string | undefined;

  while (result.scanned < maxMessages) {
    let listResp;
    try {
      listResp = await client.users.messages.list({
        userId: ownerId,
        q,
        maxResults: Math.min(pageSize, maxMessages - result.scanned),
        pageToken,
      });
    } catch (err) {
      throw classifyGoogleError(err);
    }
    result.pages += 1;

    const messages = listResp.data.messages ?? [];
    if (messages.length === 0) break;

    for (const msgRef of messages) {
      result.scanned += 1;
      const gid = msgRef.id;
      if (!gid) continue;

      // Cheap pre-check: skip a full `messages.get` if we already have it.
      const exists = await prisma.gmailMessage.findUnique({
        where: { userId_googleMessageId: { userId, googleMessageId: gid } },
        select: { id: true },
      });
      if (exists) {
        result.alreadyKnown += 1;
        continue;
      }

      let detail;
      try {
        const { data } = await client.users.messages.get({
          userId: ownerId,
          id: gid,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        });
        detail = data;
      } catch (err) {
        logger.warn('pollGmail: messages.get failed for one message — skipping', {
          userId,
          messageId: gid,
          error: (err as Error).message,
        });
        continue;
      }

      const subject = headerValue(detail.payload?.headers, 'Subject') ?? '(no subject)';
      const fromHeader = headerValue(detail.payload?.headers, 'From') ?? '';
      const dateHeader = headerValue(detail.payload?.headers, 'Date');
      const receivedAt = detail.internalDate
        ? new Date(Number(detail.internalDate))
        : dateHeader
          ? new Date(dateHeader)
          : new Date();

      try {
        await prisma.gmailMessage.create({
          data: {
            userId,
            googleMessageId: gid,
            threadId: detail.threadId ?? gid,
            fromAddress: fromHeader.slice(0, 320),
            subject: subject.slice(0, 500),
            snippet: (detail.snippet ?? '').slice(0, 2000),
            receivedAt,
          },
        });
        result.inserted += 1;
      } catch (err) {
        if ((err as { code?: string }).code === 'P2002') {
          // raced — already inserted by a concurrent poll
          result.alreadyKnown += 1;
          continue;
        }
        throw err;
      }
    }

    pageToken = listResp.data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { googleGmailLastPolledAt: new Date() },
  });

  return result;
}

/**
 * Fetch a Gmail message's full body, run AI extraction, and create the
 * right downstream entity (Bill / Appointment / Reminder). The
 * `GmailMessage.processedAt` is set on success.
 */
export async function processGmailMessage(
  gmailMessageId: string,
  options: PollOptions = {},
): Promise<ProcessResult> {
  const msg = await prisma.gmailMessage.findUnique({ where: { id: gmailMessageId } });
  if (!msg) throw new Error(`GmailMessage ${gmailMessageId} not found`);
  if (msg.processedAt) {
    return { category: msg.category, skipped: true };
  }

  const ai = await loadAiBridge();
  if (!ai) {
    logger.info('processGmailMessage: AI bridge unavailable — leaving message unprocessed', {
      gmailMessageId,
    });
    return { category: null, skipped: true };
  }

  // Fetch the full body via Gmail.
  const auth = await getGoogleClient(msg.userId);
  const client = buildGmailClient(auth, options.gmailOverride);
  let detail: gmail_v1.Schema$Message;
  try {
    const { data } = await client.users.messages.get({
      userId: options.userIdOnGmail ?? 'me',
      id: msg.googleMessageId,
      format: 'full',
    });
    detail = data;
  } catch (err) {
    throw classifyGoogleError(err);
  }

  const bodyText = extractBody(detail.payload ?? undefined).slice(0, MAX_BODY_CHARS);
  const aiInput = {
    subject: msg.subject,
    body: bodyText,
    fromAddress: msg.fromAddress,
  };

  // Classify first so we can fan out to the right extractor.
  let category: 'bill' | 'receipt' | 'appointment' | 'other' = 'other';
  try {
    const cls = await ai.classifyEmail(aiInput);
    if (cls?.category) category = cls.category;
  } catch (err) {
    logger.warn('processGmailMessage: classify failed — defaulting to other', {
      gmailMessageId,
      error: (err as Error).message,
    });
  }

  const extractionRefs: Record<string, unknown> = { category };
  const out: ProcessResult = { category };

  try {
    if (category === 'bill' || category === 'receipt') {
      const bill = await ai.extractBillFromEmail(aiInput);
      if (bill?.isBill && bill.name && bill.amount != null) {
        const created = await prisma.bill.create({
          data: {
            userId: msg.userId,
            name: bill.name.slice(0, 200),
            category: (bill.category ?? 'Other').slice(0, 50),
            amount: new Prisma.Decimal(bill.amount.toFixed(2)),
            frequency: (bill.frequency ?? 'MONTHLY') as BillFrequency,
            nextDueDate: bill.nextDueDate ? new Date(bill.nextDueDate) : new Date(),
            autoDetected: true,
            source: 'gmail',
            sourceRef: msg.id,
          },
        });
        extractionRefs.billId = created.id;
        out.createdBillId = created.id;
      }
    } else if (category === 'appointment') {
      const appt = await ai.extractAppointmentFromEmail(aiInput);
      if (appt?.isAppointment && appt.title && appt.dateTime) {
        const created = await prisma.appointment.create({
          data: {
            userId: msg.userId,
            title: appt.title.slice(0, 200),
            dateTime: new Date(appt.dateTime),
            endTime: appt.endTime ? new Date(appt.endTime) : undefined,
            location: appt.location?.slice(0, 500),
            notes: appt.notes,
            source: 'gmail',
            sourceRef: msg.id,
          },
        });
        extractionRefs.appointmentId = created.id;
        out.createdAppointmentId = created.id;
      }
    }
  } catch (err) {
    logger.error('processGmailMessage: AI extraction failed', {
      gmailMessageId,
      category,
      error: (err as Error).message,
    });
    // Don't rethrow — still mark processed so we don't loop on a bad msg.
    extractionRefs.extractionError = (err as Error).message.slice(0, 200);
  }

  await prisma.gmailMessage.update({
    where: { id: gmailMessageId },
    data: {
      processedAt: new Date(),
      category,
      extractionRefs: extractionRefs as never,
    },
  });

  return out;
}

/**
 * Daily inbox triage: load yesterday's classified messages, build a
 * compact triage summary via AI, log it (the dashboard reader picks up
 * GmailMessage / extractionRefs separately).
 *
 * No `DashboardInsight` model exists yet in the schema — when one lands,
 * swap the `logger.info` for the actual write.
 */
export async function summarizeInboxForUser(
  userId: string,
  date: Date = new Date(),
): Promise<{ summary: string | null }> {
  const ai = await loadAiBridge();
  if (!ai) {
    return { summary: null };
  }

  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const msgs = await prisma.gmailMessage.findMany({
    where: {
      userId,
      receivedAt: { gte: dayStart, lt: dayEnd },
    },
    orderBy: { receivedAt: 'desc' },
    take: 50,
  });
  if (msgs.length === 0) return { summary: null };

  try {
    const out = await ai.summarizeInboxTriage({
      emails: msgs.map((m) => ({
        subject: m.subject,
        fromAddress: m.fromAddress,
        snippet: m.snippet.slice(0, 400),
        receivedAt: m.receivedAt.toISOString(),
        category: m.category,
      })),
    });
    if (!out) return { summary: null };
    logger.info('summarizeInboxForUser: triage summary generated', {
      userId,
      summary: out.summary.slice(0, 200),
      messageCount: msgs.length,
    });
    return { summary: out.summary };
  } catch (err) {
    logger.error('summarizeInboxForUser failed', {
      userId,
      error: (err as Error).message,
    });
    return { summary: null };
  }
}

/**
 * Optional helper: mark a Gmail message as read once we've extracted
 * what we need. Only callable if the user granted `gmail.modify`. We
 * fall back silently if not.
 */
export async function markMessageRead(
  userId: string,
  gmailMessageId: string,
  options: PollOptions = {},
): Promise<{ marked: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleScopes: true },
  });
  if (!user) return { marked: false };
  if (!user.googleScopes.some((s) => s.endsWith('gmail.modify'))) {
    return { marked: false };
  }
  try {
    const auth = await getGoogleClient(userId);
    const client = buildGmailClient(auth, options.gmailOverride);
    await client.users.messages.modify({
      userId: options.userIdOnGmail ?? 'me',
      id: gmailMessageId,
      requestBody: { removeLabelIds: ['UNREAD'] },
    });
    return { marked: true };
  } catch (err) {
    logger.warn('markMessageRead failed', {
      userId,
      gmailMessageId,
      error: (err as Error).message,
    });
    return { marked: false };
  }
}
