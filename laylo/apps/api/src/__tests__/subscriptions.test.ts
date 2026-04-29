import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Express } from 'express';
import request from 'supertest';

// ── Mock Prisma ─────────────────────────────────────────────────────

const mockPrisma = {
  subscription: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
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

// ── Mock env ────────────────────────────────────────────────────────

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test',
  },
}));

// ── Mock auth middleware ────────────────────────────────────────────

const TEST_USER_ID = 'user-subs-1';
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
  const subsRouter = (await import('../routes/subscriptions')).default;
  app.use('/api/subscriptions', subsRouter);
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

const baseSub = {
  id: 'sub-1',
  userId: TEST_USER_ID,
  name: 'Netflix',
  category: 'entertainment',
  amount: 15.99,
  frequency: 'MONTHLY',
  nextRenewalDate: new Date('2026-05-15T00:00:00Z'),
  isAutopay: true,
  notes: null,
  status: 'ACTIVE',
  cancellationDate: null,
  deletedAt: null,
  createdAt: new Date('2026-04-01'),
  updatedAt: new Date('2026-04-01'),
  autoDetected: false,
  detectedFromTxnId: null,
};

// ── Tests ───────────────────────────────────────────────────────────

describe('Subscriptions routes — Plaid integration fields', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.bankDataAccessLog.create.mockResolvedValue({ id: 'log-1' });
    app = await createApp();
  });

  describe('GET /api/subscriptions', () => {
    it('does NOT include detectedTransactions by default', async () => {
      mockPrisma.subscription.findMany.mockResolvedValueOnce([baseSub]);

      const res = await request(app).get('/api/subscriptions').expect(200);

      expect(res.body.success).toBe(true);
      const call = mockPrisma.subscription.findMany.mock.calls[0][0];
      expect(call.include).toBeUndefined();
      expect(mockPrisma.bankDataAccessLog.create).not.toHaveBeenCalled();
    });

    it('exposes autoDetected and detectedFromTxnId in the response', async () => {
      mockPrisma.subscription.findMany.mockResolvedValueOnce([
        { ...baseSub, autoDetected: true, detectedFromTxnId: 'tx-77' },
      ]);

      const res = await request(app).get('/api/subscriptions').expect(200);

      expect(res.body.data[0].autoDetected).toBe(true);
      expect(res.body.data[0].detectedFromTxnId).toBe('tx-77');
    });

    it('?includeTransactions=true loads detectedTransactions and writes a READ audit log', async () => {
      mockPrisma.subscription.findMany.mockResolvedValueOnce([
        {
          ...baseSub,
          autoDetected: true,
          detectedFromTxnId: 'tx-77',
          detectedTransactions: [
            { id: 'tx-77', amount: 15.99, date: new Date('2026-04-15') },
          ],
        },
      ]);

      const res = await request(app)
        .get('/api/subscriptions?includeTransactions=true')
        .expect(200);

      expect(res.body.data[0].detectedTransactions).toHaveLength(1);

      const call = mockPrisma.subscription.findMany.mock.calls[0][0];
      expect(call.include?.detectedTransactions).toBeDefined();
      expect(call.where.userId).toBe(TEST_USER_ID);

      expect(mockPrisma.bankDataAccessLog.create).toHaveBeenCalledOnce();
      const log = mockPrisma.bankDataAccessLog.create.mock.calls[0][0].data;
      expect(log.action).toBe('READ');
      expect(log.resource).toBe('Transaction');
      expect(log.userId).toBe(TEST_USER_ID);
    });

    it('returns empty detectedTransactions for subs without matched txns', async () => {
      mockPrisma.subscription.findMany.mockResolvedValueOnce([
        { ...baseSub, detectedTransactions: [] },
      ]);

      const res = await request(app)
        .get('/api/subscriptions?includeTransactions=true')
        .expect(200);

      expect(res.body.data[0].detectedTransactions).toEqual([]);
    });
  });

  describe('POST /api/subscriptions — mass-assignment protection', () => {
    it('returns 400 when client tries to set autoDetected', async () => {
      const res = await request(app)
        .post('/api/subscriptions')
        .send({
          name: 'Spotify',
          category: 'entertainment',
          amount: 9.99,
          frequency: 'MONTHLY',
          nextRenewalDate: '2026-05-15T00:00:00.000Z',
          autoDetected: true,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
    });

    it('returns 400 when client tries to set detectedFromTxnId', async () => {
      const res = await request(app)
        .post('/api/subscriptions')
        .send({
          name: 'Spotify',
          category: 'entertainment',
          amount: 9.99,
          frequency: 'MONTHLY',
          nextRenewalDate: '2026-05-15T00:00:00.000Z',
          detectedFromTxnId: 'tx-attempt',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
    });

    it('returns 400 when client tries to set userId', async () => {
      const res = await request(app)
        .post('/api/subscriptions')
        .send({
          name: 'Spotify',
          category: 'entertainment',
          amount: 9.99,
          frequency: 'MONTHLY',
          nextRenewalDate: '2026-05-15T00:00:00.000Z',
          userId: 'someone-else',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
    });

    it('creates a subscription with valid input', async () => {
      mockPrisma.subscription.create.mockResolvedValueOnce({
        ...baseSub,
        id: 'sub-new',
        name: 'Spotify',
      });

      const res = await request(app)
        .post('/api/subscriptions')
        .send({
          name: 'Spotify',
          category: 'entertainment',
          amount: 9.99,
          frequency: 'MONTHLY',
          nextRenewalDate: '2026-05-15T00:00:00.000Z',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      const call = mockPrisma.subscription.create.mock.calls[0][0];
      expect(call.data.userId).toBe(TEST_USER_ID);
      expect(call.data.autoDetected).toBeUndefined();
    });
  });

  describe('PUT /api/subscriptions/:id — mass-assignment protection', () => {
    it('returns 400 when client tries to set autoDetected', async () => {
      const res = await request(app)
        .put('/api/subscriptions/sub-1')
        .send({ autoDetected: true })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    });

    it('returns 400 when client tries to set detectedFromTxnId', async () => {
      const res = await request(app)
        .put('/api/subscriptions/sub-1')
        .send({ detectedFromTxnId: 'tx-attempt' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    });
  });
});
