import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Express } from 'express';
import request from 'supertest';

// ── Mock Prisma ─────────────────────────────────────────────────────

const mockPrisma = {
  bill: {
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

const TEST_USER_ID = 'user-bills-1';
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
  const billsRouter = (await import('../routes/bills')).default;
  app.use('/api/bills', billsRouter);
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

const baseBill = {
  id: 'bill-1',
  userId: TEST_USER_ID,
  name: 'Electric',
  category: 'utilities',
  amount: 80,
  frequency: 'MONTHLY',
  nextDueDate: new Date('2026-05-15T00:00:00Z'),
  isAutopay: false,
  notes: null,
  status: 'ACTIVE',
  deletedAt: null,
  createdAt: new Date('2026-04-01'),
  updatedAt: new Date('2026-04-01'),
  autoDetected: false,
  detectedFromTxnId: null,
};

// ── Tests ───────────────────────────────────────────────────────────

describe('Bills routes — Plaid integration fields', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.bankDataAccessLog.create.mockResolvedValue({ id: 'log-1' });
    app = await createApp();
  });

  describe('GET /api/bills', () => {
    it('does NOT include detectedTransactions by default', async () => {
      mockPrisma.bill.findMany.mockResolvedValueOnce([baseBill]);

      const res = await request(app).get('/api/bills').expect(200);

      expect(res.body.success).toBe(true);
      // Prisma was called without an `include` for transactions
      const call = mockPrisma.bill.findMany.mock.calls[0][0];
      expect(call.include).toBeUndefined();
      // No audit log written (no txn data exposed)
      expect(mockPrisma.bankDataAccessLog.create).not.toHaveBeenCalled();
    });

    it('exposes autoDetected and detectedFromTxnId in the response', async () => {
      mockPrisma.bill.findMany.mockResolvedValueOnce([
        { ...baseBill, autoDetected: true, detectedFromTxnId: 'tx-99' },
      ]);

      const res = await request(app).get('/api/bills').expect(200);

      expect(res.body.data[0].autoDetected).toBe(true);
      expect(res.body.data[0].detectedFromTxnId).toBe('tx-99');
    });

    it('?includeTransactions=true loads detectedTransactions and writes a READ audit log', async () => {
      mockPrisma.bill.findMany.mockResolvedValueOnce([
        {
          ...baseBill,
          autoDetected: true,
          detectedFromTxnId: 'tx-99',
          detectedTransactions: [
            { id: 'tx-99', amount: 80, date: new Date('2026-04-15') },
            { id: 'tx-100', amount: 80, date: new Date('2026-03-15') },
          ],
        },
      ]);

      const res = await request(app)
        .get('/api/bills?includeTransactions=true')
        .expect(200);

      expect(res.body.data[0].detectedTransactions).toHaveLength(2);

      // Prisma include is set
      const call = mockPrisma.bill.findMany.mock.calls[0][0];
      expect(call.include?.detectedTransactions).toBeDefined();
      expect(call.include.detectedTransactions.where.deletedAt).toBeNull();
      expect(call.include.detectedTransactions.where.date.gte).toBeInstanceOf(Date);

      // Always scoped by userId
      expect(call.where.userId).toBe(TEST_USER_ID);

      // Audit log
      expect(mockPrisma.bankDataAccessLog.create).toHaveBeenCalledOnce();
      const log = mockPrisma.bankDataAccessLog.create.mock.calls[0][0].data;
      expect(log.action).toBe('READ');
      expect(log.resource).toBe('Transaction');
      expect(log.userId).toBe(TEST_USER_ID);
    });

    it('returns empty detectedTransactions array for bills without matched txns', async () => {
      mockPrisma.bill.findMany.mockResolvedValueOnce([
        { ...baseBill, detectedTransactions: [] },
      ]);

      const res = await request(app)
        .get('/api/bills?includeTransactions=true')
        .expect(200);

      expect(res.body.data[0].detectedTransactions).toEqual([]);
    });
  });

  describe('POST /api/bills — mass-assignment protection', () => {
    it('returns 400 when client tries to set autoDetected', async () => {
      const res = await request(app)
        .post('/api/bills')
        .send({
          name: 'Streaming',
          category: 'entertainment',
          amount: 12,
          frequency: 'MONTHLY',
          nextDueDate: '2026-05-15T00:00:00.000Z',
          autoDetected: true, // not allowed
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockPrisma.bill.create).not.toHaveBeenCalled();
    });

    it('returns 400 when client tries to set detectedFromTxnId', async () => {
      const res = await request(app)
        .post('/api/bills')
        .send({
          name: 'Streaming',
          category: 'entertainment',
          amount: 12,
          frequency: 'MONTHLY',
          nextDueDate: '2026-05-15T00:00:00.000Z',
          detectedFromTxnId: 'tx-attempt',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(mockPrisma.bill.create).not.toHaveBeenCalled();
    });

    it('returns 400 when client tries to set userId', async () => {
      const res = await request(app)
        .post('/api/bills')
        .send({
          name: 'Streaming',
          category: 'entertainment',
          amount: 12,
          frequency: 'MONTHLY',
          nextDueDate: '2026-05-15T00:00:00.000Z',
          userId: 'someone-else',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(mockPrisma.bill.create).not.toHaveBeenCalled();
    });

    it('creates a bill with valid input', async () => {
      mockPrisma.bill.create.mockResolvedValueOnce({
        ...baseBill,
        id: 'bill-new',
        name: 'Internet',
      });

      const res = await request(app)
        .post('/api/bills')
        .send({
          name: 'Internet',
          category: 'utilities',
          amount: 60,
          frequency: 'MONTHLY',
          nextDueDate: '2026-05-15T00:00:00.000Z',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      // Verify userId came from req.user, not body
      const call = mockPrisma.bill.create.mock.calls[0][0];
      expect(call.data.userId).toBe(TEST_USER_ID);
      expect(call.data.autoDetected).toBeUndefined(); // not set by route
    });
  });

  describe('PUT /api/bills/:id — mass-assignment protection', () => {
    it('returns 400 when client tries to set autoDetected', async () => {
      const res = await request(app)
        .put('/api/bills/bill-1')
        .send({ autoDetected: true })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(mockPrisma.bill.update).not.toHaveBeenCalled();
    });

    it('returns 400 when client tries to set detectedFromTxnId', async () => {
      const res = await request(app)
        .put('/api/bills/bill-1')
        .send({ detectedFromTxnId: 'tx-attempt' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(mockPrisma.bill.update).not.toHaveBeenCalled();
    });
  });
});
