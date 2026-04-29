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

const txClient = {
  plaidItem: {
    create: vi.fn(),
  },
  bankAccount: {
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
};

const mockPrisma = {
  plaidItem: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  bankAccount: {
    createMany: vi.fn(),
  },
  $transaction: vi.fn(async (fn: (tx: typeof txClient) => Promise<unknown>) =>
    fn(txClient),
  ),
  bankDataAccessLog: {
    create: vi.fn().mockResolvedValue({ id: 'log-1' }),
  },
};

vi.mock('../../config/prisma', () => ({ prisma: mockPrisma }));

// ── Mock auth middleware ────────────────────────────────────────────

const TEST_USER_ID = 'user-link-1';

vi.mock('../../middleware/auth', () => ({
  requireAuth: (req: { user: { userId: string } }, _res: unknown, next: () => void) => {
    req.user = { userId: TEST_USER_ID };
    next();
  },
}));

// ── Mock rate limiters (no-op) ──────────────────────────────────────

vi.mock('../../middleware/rateLimiter', () => ({
  webhookLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  plaidSyncLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  globalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  authLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// ── Mock Plaid SDK wrapper ──────────────────────────────────────────

const mockCreateLinkToken = vi.fn();
const mockExchangePublicToken = vi.fn();
const mockRemoveItem = vi.fn();
const mockVerifyWebhook = vi.fn();

vi.mock('../../services/plaid', () => ({
  createLinkToken: (...args: unknown[]) => mockCreateLinkToken(...args),
  exchangePublicToken: (...args: unknown[]) => mockExchangePublicToken(...args),
  removeItem: (...args: unknown[]) => mockRemoveItem(...args),
  verifyWebhook: (...args: unknown[]) => mockVerifyWebhook(...args),
  PlaidError: class PlaidError extends Error {
    code: string;
    constructor(msg: string, opts: { code: string }) {
      super(msg);
      this.code = opts.code;
    }
  },
}));

// ── Mock crypto ─────────────────────────────────────────────────────

// The mock encryption returns an opaque base64-like string that does NOT
// contain the plaintext substring — mirroring real AES-GCM ciphertext.
// A small map lets the matching decrypt mock recover the plaintext for
// tests that exercise the round-trip.
const MOCK_CIPHERTEXT = 'v1:eW91ck1vY2tFbmNyeXB0ZWRUb2tlbg==';
const mockEnc = new Map<string, string>();
vi.mock('../../services/crypto', () => ({
  encryptAccessToken: (s: string) => {
    mockEnc.set(MOCK_CIPHERTEXT, s);
    return MOCK_CIPHERTEXT;
  },
  decryptAccessToken: (s: string) => mockEnc.get(s) ?? '',
  CryptoError: class CryptoError extends Error {},
}));

// ── Mock job queue ──────────────────────────────────────────────────

const mockEnqueue = vi.fn();
vi.mock('../../jobs/queue', () => ({
  enqueuePlaidJob: (...args: unknown[]) => mockEnqueue(...args),
  JobType: {
    PLAID_INITIAL_SYNC: 'PLAID_INITIAL_SYNC',
    PLAID_INCREMENTAL_SYNC: 'PLAID_INCREMENTAL_SYNC',
    PLAID_REBALANCE: 'PLAID_REBALANCE',
  },
}));

// ── App helper ──────────────────────────────────────────────────────

async function createApp(): Promise<Express> {
  const app = express();
  app.use(express.json());
  const plaidRouter = (await import('../../routes/plaid')).default;
  app.use('/api/plaid', plaidRouter);
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

describe('Plaid link → exchange → enqueue flow (integration)', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createApp();
  });

  it('POST /link/token/create returns linkToken + expiration', async () => {
    mockCreateLinkToken.mockResolvedValueOnce({
      linkToken: 'link-sandbox-123',
      expiration: '2026-04-29T00:00:00Z',
    });

    const res = await request(app)
      .post('/api/plaid/link/token/create')
      .send({})
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      linkToken: 'link-sandbox-123',
      expiration: '2026-04-29T00:00:00Z',
    });
    expect(mockCreateLinkToken).toHaveBeenCalledWith(TEST_USER_ID, undefined);
    // Audit log written for the LINK action
    expect(mockPrisma.bankDataAccessLog.create).toHaveBeenCalled();
    const arg = mockPrisma.bankDataAccessLog.create.mock.calls[0][0];
    expect(arg.data.action).toBe('LINK');
    expect(arg.data.resource).toBe('PlaidItem');
  });

  it('POST /link/token/exchange creates PlaidItem, encrypts token, creates accounts, enqueues initial sync, audits', async () => {
    mockExchangePublicToken.mockResolvedValueOnce({
      accessToken: 'access-sandbox-real-token',
      itemId: 'plaid-item-abc',
    });
    mockPrisma.plaidItem.findUnique.mockResolvedValueOnce(null); // no duplicate
    txClient.plaidItem.create.mockResolvedValueOnce({
      id: 'pi-internal-1',
      userId: TEST_USER_ID,
    });
    mockEnqueue.mockResolvedValueOnce({ id: 'job-init-1' });

    const body = {
      publicToken: 'public-sandbox-x',
      institutionId: 'ins_109508',
      institutionName: 'First Platypus Bank',
      accounts: [
        { id: 'acct-1', name: 'Plaid Checking', mask: '0000', type: 'depository', subtype: 'checking' },
        { id: 'acct-2', name: 'Plaid Saving', mask: '1111', type: 'depository', subtype: 'savings' },
      ],
    };

    const res = await request(app)
      .post('/api/plaid/link/token/exchange')
      .send(body)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.plaidItemId).toBe('pi-internal-1');
    expect(res.body.data.accountsLinked).toBe(2);

    // Encrypted token (not plaintext) was passed into prisma.plaidItem.create
    const createArg = txClient.plaidItem.create.mock.calls[0][0];
    expect(createArg.data.userId).toBe(TEST_USER_ID);
    expect(createArg.data.plaidItemId).toBe('plaid-item-abc');
    expect(createArg.data.accessTokenCiphertext).toBe(MOCK_CIPHERTEXT);
    expect(createArg.data.accessTokenCiphertext).not.toContain('access-sandbox-real-token'.slice(7));
    expect(createArg.data.status).toBe('ACTIVE');

    // BankAccount.createMany was called with both accounts, mapped to enums
    expect(txClient.bankAccount.createMany).toHaveBeenCalled();
    const createManyArg = txClient.bankAccount.createMany.mock.calls[0][0];
    expect(createManyArg.data).toHaveLength(2);
    expect(createManyArg.data[0]).toEqual(
      expect.objectContaining({
        userId: TEST_USER_ID,
        plaidItemId: 'pi-internal-1',
        plaidAccountId: 'acct-1',
        type: 'DEPOSITORY',
        subtype: 'CHECKING',
      }),
    );

    // Initial sync was enqueued
    expect(mockEnqueue).toHaveBeenCalledWith('PLAID_INITIAL_SYNC', {
      plaidItemId: 'pi-internal-1',
    });

    // Audit log written
    const auditCalls = mockPrisma.bankDataAccessLog.create.mock.calls.map((c) => c[0].data);
    const exchanged = auditCalls.find((c) => c.context?.stage === 'exchanged');
    expect(exchanged).toBeDefined();
    expect(exchanged.userId).toBe(TEST_USER_ID);
    expect(exchanged.action).toBe('LINK');
    expect(exchanged.resourceId).toBe('pi-internal-1');
  });

  it('POST /link/token/exchange returns 409 on duplicate Plaid item_id', async () => {
    mockExchangePublicToken.mockResolvedValueOnce({
      accessToken: 'access-tok',
      itemId: 'plaid-item-already',
    });
    mockPrisma.plaidItem.findUnique.mockResolvedValueOnce({
      id: 'pi-existing',
      plaidItemId: 'plaid-item-already',
    });

    const res = await request(app)
      .post('/api/plaid/link/token/exchange')
      .send({
        publicToken: 'public-sandbox-y',
        institutionId: 'ins_1',
        institutionName: 'Test Bank',
        accounts: [
          { id: 'acct-1', name: 'A', mask: null, type: 'depository', subtype: 'checking' },
        ],
      })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ITEM_ALREADY_LINKED');
    expect(txClient.plaidItem.create).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('POST /link/token/exchange validates request shape (400 on missing fields)', async () => {
    const res = await request(app)
      .post('/api/plaid/link/token/exchange')
      .send({ publicToken: 'p' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockExchangePublicToken).not.toHaveBeenCalled();
  });
});
