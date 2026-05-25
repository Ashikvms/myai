/**
 * Tests for `services/google-gmail.ts` — focuses on `processGmailMessage`
 * since that's where the AI fan-out + downstream entity creation lives.
 *
 * Approach:
 *   - Stub the dynamic `@life-admin/ai` import via vi.mock so we control
 *     which extractors exist.
 *   - In-memory prisma mock for `gmailMessage`, `bill`, `appointment`, `user`.
 *   - Inject a fake Gmail client via the `gmailOverride` option.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── env / logger ──────────────────────────────────────────────────

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    ANTHROPIC_API_KEY: 'sk-fake',
    ENCRYPTION_KEY: 'a'.repeat(64),
    ENCRYPTION_KEY_VERSION: 1,
    GOOGLE_CLIENT_ID: 'cid',
    GOOGLE_CLIENT_SECRET: 'sec',
    GOOGLE_CALENDAR_SCOPES: 'https://www.googleapis.com/auth/calendar',
    GOOGLE_GMAIL_SCOPES: 'https://www.googleapis.com/auth/gmail.readonly',
  },
}));

vi.mock('../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../services/google-oauth', async () => {
  const actual = await vi.importActual<typeof import('../services/google-oauth')>(
    '../services/google-oauth',
  );
  return {
    ...actual,
    getGoogleClient: vi.fn().mockResolvedValue({}),
  };
});

// ── AI bridge mocks ──────────────────────────────────────────────

const extractBillFromEmail = vi.fn();
const extractAppointmentFromEmail = vi.fn();
const classifyEmail = vi.fn();
const summarizeInboxTriage = vi.fn();

vi.mock('@life-admin/ai', () => ({
  extractBillFromEmail,
  extractAppointmentFromEmail,
  classifyEmail,
  summarizeInboxTriage,
}));

// ── In-memory prisma ─────────────────────────────────────────────

interface GmailMsgRow {
  id: string;
  userId: string;
  googleMessageId: string;
  subject: string;
  fromAddress: string;
  snippet: string;
  threadId: string;
  receivedAt: Date;
  processedAt: Date | null;
  category: string | null;
  extractionRefs: unknown;
  deletedAt: Date | null;
}
interface BillRow {
  id: string;
  userId: string;
  name: string;
  amount: unknown;
  frequency: string;
  category: string;
  nextDueDate: Date;
  autoDetected: boolean;
  source: string | null;
  sourceRef: string | null;
}
interface AppointmentRow {
  id: string;
  userId: string;
  title: string;
  dateTime: Date;
  endTime: Date | null;
  source: string | null;
  sourceRef: string | null;
}

const msgs: Record<string, GmailMsgRow> = {};
const bills: Record<string, BillRow> = {};
const appts: Record<string, AppointmentRow> = {};
let nextSeq = 0;
function nextId(p: string): string {
  nextSeq += 1;
  return `${p}-${nextSeq}`;
}

const mockPrisma = {
  user: {
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      googleScopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      googleGmailLastPolledAt: null,
    })),
    update: vi.fn().mockResolvedValue({}),
  },
  gmailMessage: {
    findUnique: vi.fn(async ({ where }: { where: { id?: string; userId_googleMessageId?: { userId: string; googleMessageId: string } } }) => {
      if (where.id) return msgs[where.id] ?? null;
      if (where.userId_googleMessageId) {
        return (
          Object.values(msgs).find(
            (m) =>
              m.userId === where.userId_googleMessageId!.userId &&
              m.googleMessageId === where.userId_googleMessageId!.googleMessageId,
          ) ?? null
        );
      }
      return null;
    }),
    create: vi.fn(async ({ data }: { data: Omit<GmailMsgRow, 'id'> }) => {
      const id = nextId('gm');
      msgs[id] = { id, ...data };
      return msgs[id];
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<GmailMsgRow> }) => {
      const m = msgs[where.id];
      if (!m) throw new Error('not found');
      Object.assign(m, data);
      return m;
    }),
    findMany: vi.fn().mockResolvedValue([]),
  },
  bill: {
    create: vi.fn(async ({ data }: { data: Omit<BillRow, 'id'> }) => {
      const id = nextId('bill');
      bills[id] = { id, ...data };
      return bills[id];
    }),
  },
  appointment: {
    create: vi.fn(async ({ data }: { data: Omit<AppointmentRow, 'id'> }) => {
      const id = nextId('appt');
      appts[id] = { id, ...data };
      return appts[id];
    }),
  },
};

vi.mock('../config/prisma', () => ({ prisma: mockPrisma }));

// ── Fake Gmail client ────────────────────────────────────────────

function makeFakeGmail(body: string) {
  // Build a multi-part mime payload with a plain-text body
  const data = Buffer.from(body, 'utf8').toString('base64url');
  return {
    users: {
      messages: {
        list: vi.fn().mockResolvedValue({ data: { messages: [] } }),
        get: vi.fn().mockResolvedValue({
          data: {
            id: 'gid-1',
            threadId: 'thread-1',
            internalDate: String(Date.now()),
            snippet: body.slice(0, 200),
            payload: {
              headers: [
                { name: 'Subject', value: 'Your bill is due' },
                { name: 'From', value: 'Electric Co <noreply@elec.example>' },
              ],
              parts: [
                {
                  mimeType: 'text/plain',
                  body: { data },
                },
              ],
            },
          },
        }),
        modify: vi.fn().mockResolvedValue({}),
      },
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────

describe('processGmailMessage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    for (const k of Object.keys(msgs)) delete msgs[k];
    for (const k of Object.keys(bills)) delete bills[k];
    for (const k of Object.keys(appts)) delete appts[k];
    nextSeq = 0;
    const mod = await import('../services/google-gmail');
    mod._resetGmailAiBridgeCache();
  });

  it('creates a Bill row when AI returns isBill: true', async () => {
    msgs['gm-1'] = {
      id: 'gm-1',
      userId: 'u-1',
      googleMessageId: 'gid-1',
      subject: 'Bill due',
      fromAddress: 'elec',
      snippet: 'snip',
      threadId: 'tid',
      receivedAt: new Date(),
      processedAt: null,
      category: null,
      extractionRefs: null,
      deletedAt: null,
    };
    classifyEmail.mockResolvedValueOnce({ category: 'bill', confidence: 0.95 });
    extractBillFromEmail.mockResolvedValueOnce({
      isBill: true,
      name: 'Electric',
      amount: 89.42,
      nextDueDate: '2026-06-15T00:00:00Z',
      frequency: 'MONTHLY',
      category: 'Utilities',
      confidence: 0.93,
    });
    const gmail = makeFakeGmail('Your electric bill of $89.42 is due 6/15.');

    const { processGmailMessage } = await import('../services/google-gmail');
    const result = await processGmailMessage('gm-1', { gmailOverride: gmail });

    expect(result.category).toBe('bill');
    expect(result.createdBillId).toBeDefined();
    expect(Object.values(bills)).toHaveLength(1);
    expect(Object.values(bills)[0]!.source).toBe('gmail');
    expect(Object.values(bills)[0]!.sourceRef).toBe('gm-1');
    expect(Object.values(bills)[0]!.autoDetected).toBe(true);
    expect(msgs['gm-1']!.processedAt).toBeInstanceOf(Date);
    expect(msgs['gm-1']!.category).toBe('bill');
  });

  it('creates an Appointment row when AI returns isAppointment: true', async () => {
    msgs['gm-2'] = {
      id: 'gm-2',
      userId: 'u-1',
      googleMessageId: 'gid-2',
      subject: 'Your appointment',
      fromAddress: 'dentist',
      snippet: 's',
      threadId: 't',
      receivedAt: new Date(),
      processedAt: null,
      category: null,
      extractionRefs: null,
      deletedAt: null,
    };
    classifyEmail.mockResolvedValueOnce({ category: 'appointment' });
    extractAppointmentFromEmail.mockResolvedValueOnce({
      isAppointment: true,
      title: 'Dentist cleaning',
      dateTime: '2026-07-01T14:00:00Z',
      endTime: '2026-07-01T15:00:00Z',
      location: '123 Main St',
    });
    const gmail = makeFakeGmail('Your appointment is at 2pm on July 1.');

    const { processGmailMessage } = await import('../services/google-gmail');
    const result = await processGmailMessage('gm-2', { gmailOverride: gmail });

    expect(result.category).toBe('appointment');
    expect(result.createdAppointmentId).toBeDefined();
    expect(Object.values(appts)).toHaveLength(1);
    expect(Object.values(appts)[0]!.source).toBe('gmail');
    expect(Object.values(appts)[0]!.sourceRef).toBe('gm-2');
  });

  it('marks the message processed even when extraction fails (no infinite reprocessing)', async () => {
    msgs['gm-3'] = {
      id: 'gm-3',
      userId: 'u-1',
      googleMessageId: 'gid-3',
      subject: 's',
      fromAddress: 'x',
      snippet: 's',
      threadId: 't',
      receivedAt: new Date(),
      processedAt: null,
      category: null,
      extractionRefs: null,
      deletedAt: null,
    };
    classifyEmail.mockResolvedValueOnce({ category: 'bill' });
    extractBillFromEmail.mockRejectedValueOnce(new Error('AI blew up'));
    const gmail = makeFakeGmail('garbled');

    const { processGmailMessage } = await import('../services/google-gmail');
    const result = await processGmailMessage('gm-3', { gmailOverride: gmail });

    expect(result.createdBillId).toBeUndefined();
    expect(msgs['gm-3']!.processedAt).toBeInstanceOf(Date);
  });

  it('does nothing on a message already processed', async () => {
    const processedAt = new Date('2026-04-01');
    msgs['gm-4'] = {
      id: 'gm-4',
      userId: 'u-1',
      googleMessageId: 'gid-4',
      subject: 's',
      fromAddress: 'x',
      snippet: 's',
      threadId: 't',
      receivedAt: new Date(),
      processedAt,
      category: 'other',
      extractionRefs: null,
      deletedAt: null,
    };
    const gmail = makeFakeGmail('whatever');

    const { processGmailMessage } = await import('../services/google-gmail');
    const result = await processGmailMessage('gm-4', { gmailOverride: gmail });

    expect(result.skipped).toBe(true);
    expect(classifyEmail).not.toHaveBeenCalled();
    expect(msgs['gm-4']!.processedAt).toBe(processedAt);
  });
});
