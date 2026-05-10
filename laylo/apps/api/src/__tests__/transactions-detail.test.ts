import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Express } from 'express';
import request from 'supertest';

// ── Mock Prisma ─────────────────────────────────────────────────────

const mockPrisma = {
  transaction: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  bankAccount: {
    findFirst: vi.fn(),
  },
  bankDataAccessLog: {
    create: vi.fn(),
  },
};
vi.mock('../config/prisma', () => ({ prisma: mockPrisma }));

// ── Mock logger ─────────────────────────────────────────────────────

vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Mock env (placeholder API key triggers mock AI fallback) ────────

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test',
    ANTHROPIC_API_KEY: 'sk-ant-placeholder-not-real',
    CLAUDE_MODEL: 'claude-sonnet-4-20250514',
  },
}));

// ── Mock auth middleware ────────────────────────────────────────────

const TEST_USER_ID = 'user-detail-1';
vi.mock('../middleware/auth', () => ({
  requireAuth: (req: { user: { userId: string } }, _res: unknown, next: () => void) => {
    req.user = { userId: TEST_USER_ID };
    next();
  },
}));

// ── App helper ──────────────────────────────────────────────────────

async function createApp(): Promise<Express> {
  const app = express();
  app.use(express.json());
  const mod = await import('../routes/transactions');
  app.use('/api/transactions', mod.default);
  app.use('/api/ai', mod.aiExplainTransactionRouter);
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

// ── Fixtures ────────────────────────────────────────────────────────

const baseTxn = {
  id: 'tx-1',
  userId: TEST_USER_ID,
  bankAccountId: 'ba-1',
  plaidTransactionId: 'plaid-tx-1',
  amount: 12.5,
  isoCurrencyCode: 'USD',
  date: new Date('2026-04-20T00:00:00Z'),
  authorizedDate: new Date('2026-04-20T00:00:00Z'),
  name: 'BLUE BOTTLE COFFEE 1234',
  merchantName: 'Blue Bottle Coffee',
  merchantLogoUrl: null,
  category: 'FOOD_AND_DRINK',
  categoryDetailed: 'COFFEE',
  paymentChannel: 'in store',
  pending: false,
  isoLocationCity: 'San Francisco',
  isoLocationRegion: 'CA',
  isoLocationCountry: 'US',
  billId: null,
  subscriptionId: null,
  matchConfidence: null,
  userVerifiedMatch: false,
  userNote: null,
  receiptUrl: null,
  deletedAt: null,
  createdAt: new Date('2026-04-20'),
  updatedAt: new Date('2026-04-20'),
};

const txnWithRelations = {
  ...baseTxn,
  bankAccount: {
    id: 'ba-1',
    name: 'Everyday Checking',
    mask: '1234',
    type: 'DEPOSITORY',
    subtype: 'CHECKING',
    plaidItem: { institutionName: 'Chase' },
  },
  bill: null,
  subscription: null,
};

// ── Tests ───────────────────────────────────────────────────────────

describe('Transaction detail routes (Item 28)', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.bankDataAccessLog.create.mockResolvedValue({ id: 'log-1' });
    app = await createApp();
  });

  // ── GET /:id ────────────────────────────────────────

  describe('GET /api/transactions/:id', () => {
    it('returns 404 for cross-user requests (IDOR)', async () => {
      // Simulating: txn exists in DB but for a different user → findFirst
      // with userId scope returns null.
      mockPrisma.transaction.findFirst.mockResolvedValueOnce(null);

      const res = await request(app).get('/api/transactions/tx-other-user').expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');

      // Confirm scoped query
      const call = mockPrisma.transaction.findFirst.mock.calls[0][0];
      expect(call.where.id).toBe('tx-other-user');
      expect(call.where.userId).toBe(TEST_USER_ID);
      expect(call.where.deletedAt).toBeNull();
    });

    it('returns enriched shape with correct pattern stats', async () => {
      mockPrisma.transaction.findFirst
        // 1st call: the detail lookup
        .mockResolvedValueOnce(txnWithRelations)
        // 2nd call: earliest in last 90 days
        .mockResolvedValueOnce({ date: new Date('2026-02-15T00:00:00Z') });

      // Pattern: 3 charges in last 30 days at this merchant
      mockPrisma.transaction.findMany.mockResolvedValueOnce([
        { amount: 5 },
        { amount: 6.5 },
        { amount: 12.5 },
      ]);

      const res = await request(app).get('/api/transactions/tx-1').expect(200);

      expect(res.body.success).toBe(true);
      const { transaction, pattern } = res.body.data;

      // Transaction shape
      expect(transaction.id).toBe('tx-1');
      expect(transaction.amount).toBe(12.5);
      expect(transaction.merchantName).toBe('Blue Bottle Coffee');
      expect(transaction.bankAccount.institutionName).toBe('Chase');
      expect(transaction.bankAccount.mask).toBe('1234');
      expect(transaction.bill).toBeNull();
      expect(transaction.subscription).toBeNull();
      // Defensive: no token leakage
      expect(JSON.stringify(res.body)).not.toContain('accessTokenCiphertext');

      // Pattern stats (24 / 3 = 8.0 avg)
      expect(pattern.merchantName).toBe('Blue Bottle Coffee');
      expect(pattern.txCount).toBe(3);
      expect(pattern.totalSpent).toBeCloseTo(24);
      expect(pattern.avgAmount).toBeCloseTo(8);
      expect(pattern.firstSeen).toBe('2026-02-15');

      // Audit log
      expect(mockPrisma.bankDataAccessLog.create).toHaveBeenCalledTimes(1);
      const log = mockPrisma.bankDataAccessLog.create.mock.calls[0][0].data;
      expect(log.action).toBe('READ');
      expect(log.resource).toBe('Transaction');
      expect(log.resourceId).toBe('tx-1');
      expect(log.context).toEqual({ detailFetch: true });
    });
  });

  // ── PATCH /:id/note ─────────────────────────────────

  describe('PATCH /api/transactions/:id/note', () => {
    it('updates and returns the saved note', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValueOnce({ id: 'tx-1' });
      mockPrisma.transaction.update.mockResolvedValueOnce({
        id: 'tx-1',
        userNote: 'Birthday gift for Sam',
      });

      const res = await request(app)
        .patch('/api/transactions/tx-1/note')
        .send({ note: 'Birthday gift for Sam' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ id: 'tx-1', userNote: 'Birthday gift for Sam' });

      const updateCall = mockPrisma.transaction.update.mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: 'tx-1' });
      expect(updateCall.data).toEqual({ userNote: 'Birthday gift for Sam' });

      // Audit log
      const log = mockPrisma.bankDataAccessLog.create.mock.calls[0][0].data;
      expect(log.action).toBe('WRITE');
      expect(log.resource).toBe('Transaction');
    });

    it('clears the note when null is passed', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValueOnce({ id: 'tx-1' });
      mockPrisma.transaction.update.mockResolvedValueOnce({
        id: 'tx-1',
        userNote: null,
      });

      const res = await request(app)
        .patch('/api/transactions/tx-1/note')
        .send({ note: null })
        .expect(200);

      expect(res.body.data.userNote).toBeNull();
      const updateCall = mockPrisma.transaction.update.mock.calls[0][0];
      expect(updateCall.data).toEqual({ userNote: null });
    });

    it('rejects notes longer than 2000 chars', async () => {
      const tooLong = 'x'.repeat(2001);

      const res = await request(app)
        .patch('/api/transactions/tx-1/note')
        .send({ note: tooLong })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
    });

    it('returns 404 for cross-user note edits (IDOR)', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValueOnce(null);

      const res = await request(app)
        .patch('/api/transactions/tx-other-user/note')
        .send({ note: 'attempt' })
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
    });
  });

  // ── POST /api/ai/explain-transaction/:id ────────────

  describe('POST /api/ai/explain-transaction/:id', () => {
    it('returns mock when ANTHROPIC_API_KEY is the placeholder', async () => {
      mockPrisma.transaction.findFirst
        .mockResolvedValueOnce(baseTxn) // ownership lookup
        .mockResolvedValueOnce(null); // earliest row
      mockPrisma.transaction.findMany.mockResolvedValueOnce([{ amount: 12.5 }]);

      const res = await request(app)
        .post('/api/ai/explain-transaction/tx-1')
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.mock).toBe(true);
      expect(typeof res.body.data.explanation).toBe('string');
      expect(res.body.data.explanation.length).toBeGreaterThan(20);
      // Mock should mention the merchant
      expect(res.body.data.explanation).toContain('Blue Bottle Coffee');
      expect(typeof res.body.data.generatedAt).toBe('string');

      // Two audit log entries: Transaction READ + AI_Explanation SYNC
      const logs = mockPrisma.bankDataAccessLog.create.mock.calls.map(
        (c: [{ data: Record<string, unknown> }]) => c[0].data,
      );
      expect(logs).toHaveLength(2);
      const readLog = logs[0]!;
      const syncLog = logs[1]!;
      expect(readLog.action).toBe('READ');
      expect(readLog.resource).toBe('Transaction');
      expect(syncLog.action).toBe('SYNC');
      expect(syncLog.resource).toBe('AI_Explanation');
      expect(syncLog.context).toEqual({ mock: true });
    });

    it('returns 404 for cross-user AI explain requests (IDOR)', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/ai/explain-transaction/tx-other-user')
        .send({})
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
      // No AI work should have been attempted
      expect(mockPrisma.transaction.findMany).not.toHaveBeenCalled();
      // No audit logs (the route exits before logging)
      expect(mockPrisma.bankDataAccessLog.create).not.toHaveBeenCalled();
    });

    it('rejects extraContext > 500 chars', async () => {
      const tooLong = 'x'.repeat(501);

      const res = await request(app)
        .post('/api/ai/explain-transaction/tx-1')
        .send({ extraContext: tooLong })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
