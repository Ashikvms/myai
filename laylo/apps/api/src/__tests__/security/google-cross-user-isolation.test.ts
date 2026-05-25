/**
 * Cross-user (IDOR) isolation for Google integration routes.
 *
 * Two users (A and B) each have their own GoogleCalendarEvent and
 * GmailMessage rows. We assert that requests authenticated as user A
 * cannot see any of B's Google data through the public listing endpoints.
 *
 * Per the spec convention (mirrors `cross-user-isolation.test.ts` for
 * Plaid): no 403s — out-of-scope ids return 404 to avoid an existence
 * oracle. List endpoints simply filter out the other user's rows.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Express, Request } from 'express';
import request from 'supertest';

const USER_A = 'user-AAA';
const USER_B = 'user-BBB';

interface GoogleCalEventRow {
  [k: string]: unknown;
  id: string;
  userId: string;
  googleEventId: string;
  calendarId: string;
  summary: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  location: string | null;
  attendees: unknown;
  syncedAt: Date;
  etag: string | null;
  appointmentId: string | null;
}

interface GmailMsgRow {
  [k: string]: unknown;
  id: string;
  userId: string;
  googleMessageId: string;
  threadId: string;
  fromAddress: string;
  subject: string;
  snippet: string;
  receivedAt: Date;
  processedAt: Date | null;
  category: string | null;
  extractionRefs: unknown;
  deletedAt: Date | null;
}

let calEvents: GoogleCalEventRow[] = [];
let gmailMsgs: GmailMsgRow[] = [];

function reseed(): void {
  calEvents = [
    {
      id: 'gce-A',
      userId: USER_A,
      googleEventId: 'g-evt-A',
      calendarId: 'primary',
      summary: 'A meeting',
      description: null,
      startAt: new Date('2026-06-01T10:00:00Z'),
      endAt: new Date('2026-06-01T11:00:00Z'),
      location: null,
      attendees: null,
      syncedAt: new Date(),
      etag: null,
      appointmentId: null,
    },
    {
      id: 'gce-B-SECRET',
      userId: USER_B,
      googleEventId: 'g-evt-B-SECRET',
      calendarId: 'primary',
      summary: "B's confidential 1:1",
      description: 'do not leak',
      startAt: new Date('2026-06-01T10:00:00Z'),
      endAt: new Date('2026-06-01T11:00:00Z'),
      location: null,
      attendees: null,
      syncedAt: new Date(),
      etag: null,
      appointmentId: null,
    },
  ];
  gmailMsgs = [
    {
      id: 'gm-A',
      userId: USER_A,
      googleMessageId: 'mid-A',
      threadId: 'tid-A',
      fromAddress: 'a@a.com',
      subject: 'A subject',
      snippet: 'A snippet',
      receivedAt: new Date(),
      processedAt: new Date(),
      category: 'bill',
      extractionRefs: null,
      deletedAt: null,
    },
    {
      id: 'gm-B-SECRET',
      userId: USER_B,
      googleMessageId: 'mid-B',
      threadId: 'tid-B',
      fromAddress: 'b@b.com',
      subject: "B's bank statement",
      snippet: 'classified',
      receivedAt: new Date(),
      processedAt: new Date(),
      category: 'bill',
      extractionRefs: null,
      deletedAt: null,
    },
  ];
}

// ── matchesWhere helper (reused from cross-user-isolation.test.ts) ──

function matchesWhere<T extends Record<string, unknown>>(row: T, where: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(where)) {
    if (v === null) {
      if (row[k] != null) return false;
    } else if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
      const nested = v as Record<string, unknown>;
      const cell = row[k] as unknown;
      if ('in' in nested && Array.isArray(nested.in)) {
        if (!nested.in.includes(cell)) return false;
      } else if ('not' in nested) {
        if (cell === nested.not) return false;
      } else if ('gte' in nested || 'lte' in nested || 'gt' in nested || 'lt' in nested) {
        if (cell instanceof Date) {
          const t = cell.getTime();
          if ('gte' in nested && t < (nested.gte as Date).getTime()) return false;
          if ('lte' in nested && t > (nested.lte as Date).getTime()) return false;
        }
      }
    } else if (row[k] !== v) {
      return false;
    }
  }
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma: Record<string, any> = {
  user: {
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      googleEmail: `${where.id}@example.com`,
      googleScopes: [],
      googleLinkedAt: new Date(),
      googleCalendarLastSyncedAt: null,
      googleGmailLastPolledAt: null,
      googleAccessTokenCiphertext: 'v1:dummy',
    })),
  },
  googleCalendarEvent: {
    findMany: vi.fn(async (args: { where: Record<string, unknown>; orderBy?: unknown; take?: number }) => {
      const filtered = calEvents.filter((e) => matchesWhere(e, args.where));
      return args.take ? filtered.slice(0, args.take) : filtered;
    }),
    deleteMany: vi.fn(async ({ where }: { where: { userId: string } }) => {
      const before = calEvents.length;
      calEvents = calEvents.filter((e) => e.userId !== where.userId);
      return { count: before - calEvents.length };
    }),
  },
  gmailMessage: {
    findMany: vi.fn(async (args: { where: Record<string, unknown>; orderBy?: unknown; take?: number }) => {
      const filtered = gmailMsgs.filter((m) => matchesWhere(m, args.where));
      return args.take ? filtered.slice(0, args.take) : filtered;
    }),
    updateMany: vi.fn(async ({ where, data }: { where: { userId: string; deletedAt: null }; data: { deletedAt: Date } }) => {
      let count = 0;
      for (const m of gmailMsgs) {
        if (m.userId === where.userId && m.deletedAt == null) {
          m.deletedAt = data.deletedAt;
          count += 1;
        }
      }
      return { count };
    }),
  },
  googleDataAccessLog: {
    create: vi.fn().mockResolvedValue({ id: 'gal' }),
  },
  $transaction: vi.fn(async (ops: unknown) => {
    if (Array.isArray(ops)) return Promise.all(ops);
    return (ops as (tx: unknown) => Promise<unknown>)(mockPrisma);
  }),
};

vi.mock('../../config/prisma', () => ({ prisma: mockPrisma }));

vi.mock('../../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    ENCRYPTION_KEY: 'a'.repeat(64),
    ENCRYPTION_KEY_VERSION: 1,
    GOOGLE_CLIENT_ID: 'cid',
    GOOGLE_CLIENT_SECRET: 'sec',
    GOOGLE_CALENDAR_SCOPES: 'https://www.googleapis.com/auth/calendar',
    GOOGLE_GMAIL_SCOPES: 'https://www.googleapis.com/auth/gmail.readonly',
    GOOGLE_LINK_REDIRECT_URI: 'http://localhost:3001/api/google/link/callback',
    GOOGLE_LINK_SUCCESS_REDIRECT: undefined,
    APP_URL: 'http://localhost:3000',
  },
}));

vi.mock('../../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../middleware/rateLimiter', () => ({
  globalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  authLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  plaidSyncLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  webhookLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  googleSyncLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  googleLinkLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../../middleware/auth', () => ({
  requireAuth: (req: Request, res: { status: (n: number) => { json: (o: unknown) => void } }, next: () => void) => {
    const u = req.headers['x-test-user'] as string | undefined;
    if (!u) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'no user' } });
      return;
    }
    (req as unknown as { user: { userId: string } }).user = { userId: u };
    next();
  },
}));

vi.mock('../../jobs/queue', () => ({
  enqueueGoogleJob: vi.fn().mockResolvedValue({ id: 'job-gx' }),
  JobType: {
    GOOGLE_CALENDAR_SYNC: 'GOOGLE_CALENDAR_SYNC',
    GOOGLE_CALENDAR_SYNC_USER: 'GOOGLE_CALENDAR_SYNC_USER',
    GOOGLE_CALENDAR_PUSH_APPOINTMENT: 'GOOGLE_CALENDAR_PUSH_APPOINTMENT',
    GOOGLE_CALENDAR_DELETE_APPOINTMENT: 'GOOGLE_CALENDAR_DELETE_APPOINTMENT',
    GMAIL_POLLING_SYNC: 'GMAIL_POLLING_SYNC',
    GMAIL_POLLING_SYNC_USER: 'GMAIL_POLLING_SYNC_USER',
    INBOX_TRIAGE: 'INBOX_TRIAGE',
  },
}));

vi.mock('../../services/google-oauth', async () => {
  const actual = await vi.importActual<typeof import('../../services/google-oauth')>(
    '../../services/google-oauth',
  );
  return {
    ...actual,
    unlinkGoogle: vi.fn().mockResolvedValue({ revokedAtGoogle: true }),
  };
});

async function createApp(): Promise<Express> {
  const app = express();
  app.use(express.json());
  const googleRouter = (await import('../../routes/google')).default;
  app.use('/api/google', googleRouter);
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(500).json({ success: false, error: { message: err.message } });
    },
  );
  return app;
}

describe('Google IDOR isolation — user A cannot reach user B Google data', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    reseed();
    app = await createApp();
  });

  it('GET /api/google/calendar/events returns only user A events', async () => {
    const res = await request(app)
      .get('/api/google/calendar/events')
      .set('x-test-user', USER_A)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('gce-A');
    expect(
      (res.body.data as Array<{ summary: string }>).find((e) =>
        e.summary.includes('confidential'),
      ),
    ).toBeUndefined();
  });

  it('GET /api/google/gmail/messages returns only user A messages', async () => {
    const res = await request(app)
      .get('/api/google/gmail/messages')
      .set('x-test-user', USER_A)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('gm-A');
    // user B's "bank statement" subject must NEVER appear in user A response
    const json = JSON.stringify(res.body);
    expect(json).not.toContain('bank statement');
    expect(json).not.toContain('classified');
  });

  it('POST /api/google/unlink only clears the calling user data', async () => {
    await request(app).post('/api/google/unlink').set('x-test-user', USER_A).expect(200);

    // user A's calendar event gone
    expect(calEvents.find((e) => e.id === 'gce-A')).toBeUndefined();
    // user B's data MUST still be present
    expect(calEvents.find((e) => e.id === 'gce-B-SECRET')).toBeDefined();
    expect(gmailMsgs.find((m) => m.id === 'gm-B-SECRET')?.deletedAt).toBeNull();
  });

  it('user B can still see their own data (sanity check — isolation cuts both ways)', async () => {
    const res = await request(app)
      .get('/api/google/calendar/events')
      .set('x-test-user', USER_B)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('gce-B-SECRET');
  });

  it('Unauthenticated requests are rejected', async () => {
    await request(app).get('/api/google/calendar/events').expect(401);
    await request(app).get('/api/google/gmail/messages').expect(401);
    await request(app).post('/api/google/unlink').expect(401);
  });
});
