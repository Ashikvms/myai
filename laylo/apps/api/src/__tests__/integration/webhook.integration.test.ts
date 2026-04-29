import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Express } from 'express';
import request from 'supertest';

// ── Mock env ────────────────────────────────────────────────────────

vi.mock('../../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test',
    PLAID_CLIENT_ID: 'test-client',
    PLAID_SECRET: 'test-secret',
    PLAID_ENV: 'sandbox',
    PLAID_PRODUCTS: 'transactions',
    PLAID_COUNTRY_CODES: 'US',
    PLAID_WEBHOOK_URL: 'https://example.test/webhook',
    PLAID_REDIRECT_URI: undefined,
    ENCRYPTION_KEY: 'a'.repeat(64),
    ENCRYPTION_KEY_VERSION: 1,
  },
}));

vi.mock('../../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── Mock Prisma ─────────────────────────────────────────────────────

const mockPrisma = {
  plaidItem: {
    findUnique: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  },
  plaidWebhookEvent: {
    create: vi.fn(),
  },
  bankDataAccessLog: {
    create: vi.fn().mockResolvedValue({ id: 'log-1' }),
  },
};

vi.mock('../../config/prisma', () => ({ prisma: mockPrisma }));

// ── Mock rate limiters ──────────────────────────────────────────────

vi.mock('../../middleware/rateLimiter', () => ({
  webhookLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  plaidSyncLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  globalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  authLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// ── Mock auth middleware (not used by webhook, but the router imports it) ─

vi.mock('../../middleware/auth', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// ── Mock Plaid SDK wrapper (verifyWebhook is the one we drive) ──────

const mockVerifyWebhook = vi.fn();

vi.mock('../../services/plaid', () => ({
  createLinkToken: vi.fn(),
  exchangePublicToken: vi.fn(),
  removeItem: vi.fn(),
  verifyWebhook: (...args: unknown[]) => mockVerifyWebhook(...args),
  PlaidError: class PlaidError extends Error {
    code: string;
    constructor(msg: string, opts: { code: string }) {
      super(msg);
      this.code = opts.code;
    }
  },
}));

vi.mock('../../services/crypto', () => ({
  encryptAccessToken: (s: string) => `v1:enc(${s})`,
  decryptAccessToken: (s: string) => s,
  CryptoError: class CryptoError extends Error {},
}));

const mockEnqueue = vi.fn();
vi.mock('../../jobs/queue', () => ({
  enqueuePlaidJob: (...args: unknown[]) => mockEnqueue(...args),
  JobType: {
    PLAID_INITIAL_SYNC: 'PLAID_INITIAL_SYNC',
    PLAID_INCREMENTAL_SYNC: 'PLAID_INCREMENTAL_SYNC',
    PLAID_REBALANCE: 'PLAID_REBALANCE',
  },
}));

// ── App helper — mounts webhook with raw body BEFORE json parser ────

async function createApp(): Promise<Express> {
  const app = express();
  const { plaidWebhookHandler } = await import('../../routes/plaid');
  app.post(
    '/api/plaid/webhook',
    express.raw({ type: 'application/json', limit: '1mb' }),
    ...plaidWebhookHandler,
  );
  app.use(express.json());
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

// ── Tests ───────────────────────────────────────────────────────────

describe('POST /api/plaid/webhook (integration)', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createApp();
  });

  it('returns 401 when verifyWebhook returns false (invalid signature)', async () => {
    mockVerifyWebhook.mockResolvedValueOnce(false);

    // F5 (post-fix): the handler now returns a body-less 401 for ALL
    // unauthenticated/unparseable requests so an attacker cannot tell
    // apart "bad signature" from "bad payload" via the response body.
    await request(app)
      .post('/api/plaid/webhook')
      .set('content-type', 'application/json')
      .send({
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'SYNC_UPDATES_AVAILABLE',
        item_id: 'plaid-item-1',
        request_id: 'req-aaa',
      })
      .expect(401);

    expect(mockEnqueue).not.toHaveBeenCalled();
    expect(mockPrisma.plaidWebhookEvent.create).not.toHaveBeenCalled();
  });

  it('returns 401 on stale (>5min) webhook (verifyWebhook -> false)', async () => {
    // The route delegates `iat` freshness checks to verifyWebhook itself —
    // the integration boundary is "verifyWebhook returns false → 401".
    // F5: blank body, no oracle.
    mockVerifyWebhook.mockResolvedValueOnce(false);

    await request(app)
      .post('/api/plaid/webhook')
      .set('content-type', 'application/json')
      .set('plaid-verification', 'stale.jwt.token')
      .send({
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'SYNC_UPDATES_AVAILABLE',
        item_id: 'plaid-item-1',
        request_id: 'req-stale',
      })
      .expect(401);
  });

  it('returns 200 + enqueues incremental sync on valid SYNC_UPDATES_AVAILABLE', async () => {
    mockVerifyWebhook.mockResolvedValueOnce(true);
    mockPrisma.plaidItem.findUnique.mockResolvedValueOnce({
      id: 'pi-internal-1',
      userId: 'user-1',
    });
    mockPrisma.plaidWebhookEvent.create.mockResolvedValueOnce({ id: 'evt-1' });
    mockEnqueue.mockResolvedValueOnce({ id: 'job-1' });

    const res = await request(app)
      .post('/api/plaid/webhook')
      .set('content-type', 'application/json')
      .send({
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'SYNC_UPDATES_AVAILABLE',
        item_id: 'plaid-item-external-1',
        request_id: 'req-fresh-1',
        environment: 'sandbox',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.eventId).toBe('evt-1');

    // PlaidWebhookEvent persisted with full payload
    expect(mockPrisma.plaidWebhookEvent.create).toHaveBeenCalled();
    const evtArg = mockPrisma.plaidWebhookEvent.create.mock.calls[0][0];
    expect(evtArg.data.webhookType).toBe('TRANSACTIONS');
    expect(evtArg.data.webhookCode).toBe('SYNC_UPDATES_AVAILABLE');
    expect(evtArg.data.externalEventId).toBe('req-fresh-1');
    expect(evtArg.data.plaidItemId).toBe('pi-internal-1');

    // lastWebhookAt was bumped on the PlaidItem
    expect(mockPrisma.plaidItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pi-internal-1' },
        data: expect.objectContaining({ lastWebhookAt: expect.any(Date) }),
      }),
    );

    // Job enqueued
    expect(mockEnqueue).toHaveBeenCalledWith('PLAID_INCREMENTAL_SYNC', {
      plaidItemId: 'pi-internal-1',
    });
  });

  it('returns 200 (duplicate=true) and does NOT enqueue on duplicate request_id (P2002)', async () => {
    mockVerifyWebhook.mockResolvedValueOnce(true);
    mockPrisma.plaidItem.findUnique.mockResolvedValueOnce({
      id: 'pi-internal-1',
      userId: 'user-1',
    });
    // Simulate Prisma unique-constraint violation on externalEventId
    const p2002 = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    mockPrisma.plaidWebhookEvent.create.mockRejectedValueOnce(p2002);

    const res = await request(app)
      .post('/api/plaid/webhook')
      .set('content-type', 'application/json')
      .send({
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'SYNC_UPDATES_AVAILABLE',
        item_id: 'plaid-item-external-1',
        request_id: 'req-duplicate',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.duplicate).toBe(true);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('records the event but does NOT enqueue on ITEM/ERROR webhook', async () => {
    mockVerifyWebhook.mockResolvedValueOnce(true);
    mockPrisma.plaidItem.findUnique.mockResolvedValueOnce({
      id: 'pi-internal-1',
      userId: 'user-1',
    });
    mockPrisma.plaidWebhookEvent.create.mockResolvedValueOnce({ id: 'evt-err' });

    await request(app)
      .post('/api/plaid/webhook')
      .set('content-type', 'application/json')
      .send({
        webhook_type: 'ITEM',
        webhook_code: 'ERROR',
        item_id: 'plaid-item-external-1',
        request_id: 'req-item-err',
        error: { error_code: 'ITEM_LOGIN_REQUIRED' },
      })
      .expect(200);

    expect(mockPrisma.plaidWebhookEvent.create).toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('returns 401 on malformed JSON body (F5: no parse-vs-signature oracle)', async () => {
    // Even with verifyWebhook → true, an unparseable body returns the same
    // body-less 401 as a signature failure. This collapses the
    // "INVALID_SIGNATURE" vs "INVALID_PAYLOAD" oracle.
    mockVerifyWebhook.mockResolvedValueOnce(true);

    await request(app)
      .post('/api/plaid/webhook')
      .set('content-type', 'application/json')
      .send('this is not json')
      .expect(401);

    expect(mockPrisma.plaidWebhookEvent.create).not.toHaveBeenCalled();
  });
});
