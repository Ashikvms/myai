import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Express } from 'express';
import request from 'supertest';

// ── Mock Prisma ─────────────────────────────────────────────────────

const mockPrisma = {
  task: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  bill: {
    findMany: vi.fn(),
  },
  subscription: {
    findMany: vi.fn(),
  },
  appointment: {
    findMany: vi.fn(),
  },
  reminder: {
    count: vi.fn(),
  },
  document: {
    findMany: vi.fn(),
  },
  bankAccount: {
    findMany: vi.fn(),
  },
  transaction: {
    findMany: vi.fn(),
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

const TEST_USER_ID = 'user-dash-1';
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
  const dashboardRouter = (await import('../routes/dashboard')).default;
  app.use('/api/dashboard', dashboardRouter);
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

// ── Helpers ─────────────────────────────────────────────────────────

function setNoData() {
  mockPrisma.task.count.mockResolvedValue(0);
  mockPrisma.task.findMany.mockResolvedValue([]);
  mockPrisma.bill.findMany.mockResolvedValue([]);
  mockPrisma.subscription.findMany.mockResolvedValue([]);
  mockPrisma.appointment.findMany.mockResolvedValue([]);
  mockPrisma.reminder.count.mockResolvedValue(0);
  mockPrisma.document.findMany.mockResolvedValue([]);
  mockPrisma.bankAccount.findMany.mockResolvedValue([]);
  mockPrisma.transaction.findMany.mockResolvedValue([]);
  mockPrisma.bankDataAccessLog.create.mockResolvedValue({ id: 'log-1' });
}

// ── Tests ───────────────────────────────────────────────────────────

describe('Dashboard route — Plaid integration fields', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createApp();
  });

  it('returns connectedAccounts/recentTransactions empty when user has no banks', async () => {
    setNoData();

    const res = await request(app).get('/api/dashboard').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.connectedAccounts).toEqual({
      count: 0,
      totalBalance: 0,
      totalDebt: 0,
      accounts: [],
    });
    expect(res.body.data.recentTransactions).toEqual([]);
    // No bank-data audit log when there's no bank data to read
    expect(mockPrisma.bankDataAccessLog.create).not.toHaveBeenCalled();
  });

  it('aggregates totalBalance from depository accounts and totalDebt from credit/loan', async () => {
    setNoData();
    mockPrisma.bankAccount.findMany.mockResolvedValueOnce([
      {
        id: 'ba-1',
        name: 'Checking',
        mask: '1234',
        type: 'DEPOSITORY',
        subtype: 'CHECKING',
        currentBalance: 1500.5,
        isoCurrencyCode: 'USD',
        plaidItem: { institutionName: 'Chase' },
      },
      {
        id: 'ba-2',
        name: 'Savings',
        mask: '5678',
        type: 'DEPOSITORY',
        subtype: 'SAVINGS',
        currentBalance: 8000,
        isoCurrencyCode: 'USD',
        plaidItem: { institutionName: 'Chase' },
      },
      {
        id: 'ba-3',
        name: 'Visa',
        mask: '9999',
        type: 'CREDIT',
        subtype: 'CREDIT_CARD',
        currentBalance: -250.25,
        isoCurrencyCode: 'USD',
        plaidItem: { institutionName: 'Amex' },
      },
      {
        id: 'ba-4',
        name: 'Auto Loan',
        mask: '4444',
        type: 'LOAN',
        subtype: 'AUTO',
        currentBalance: 12000,
        isoCurrencyCode: 'USD',
        plaidItem: { institutionName: 'Capital One' },
      },
    ]);

    const res = await request(app).get('/api/dashboard').expect(200);

    expect(res.body.data.connectedAccounts.count).toBe(4);
    // 1500.5 + 8000 = 9500.5
    expect(res.body.data.connectedAccounts.totalBalance).toBe(9500.5);
    // |-250.25| + 12000 = 12250.25
    expect(res.body.data.connectedAccounts.totalDebt).toBe(12250.25);
    expect(res.body.data.connectedAccounts.accounts).toHaveLength(4);
    // Verify the per-account shape
    const checking = res.body.data.connectedAccounts.accounts.find(
      (a: { id: string }) => a.id === 'ba-2', // 8000 is highest balance
    );
    expect(checking).toBeDefined();
    expect(checking.institutionName).toBe('Chase');
  });

  it('caps the accounts tile at 5 accounts', async () => {
    setNoData();
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: `ba-${i}`,
      name: `Acct ${i}`,
      mask: '0000',
      type: 'DEPOSITORY',
      subtype: 'CHECKING',
      currentBalance: 1000 - i,
      isoCurrencyCode: 'USD',
      plaidItem: { institutionName: 'Bank' },
    }));
    mockPrisma.bankAccount.findMany.mockResolvedValueOnce(many);

    const res = await request(app).get('/api/dashboard').expect(200);

    expect(res.body.data.connectedAccounts.count).toBe(8);
    expect(res.body.data.connectedAccounts.accounts).toHaveLength(5);
  });

  it('shapes recentTransactions and limits to 10', async () => {
    setNoData();
    mockPrisma.transaction.findMany.mockResolvedValueOnce([
      {
        id: 'tx-1',
        date: new Date('2026-04-25T00:00:00Z'),
        name: 'Whole Foods',
        merchantName: 'Whole Foods',
        amount: 42.5,
        isoCurrencyCode: 'USD',
        category: 'FOOD_AND_DRINK',
        bankAccountId: 'ba-1',
        pending: false,
        bankAccount: { name: 'Checking' },
      },
    ]);

    const res = await request(app).get('/api/dashboard').expect(200);

    expect(res.body.data.recentTransactions).toEqual([
      {
        id: 'tx-1',
        date: '2026-04-25',
        name: 'Whole Foods',
        merchantName: 'Whole Foods',
        amount: 42.5,
        isoCurrencyCode: 'USD',
        category: 'FOOD_AND_DRINK',
        accountId: 'ba-1',
        accountName: 'Checking',
        pending: false,
      },
    ]);
    // Verify the take: 10
    const txnCall = mockPrisma.transaction.findMany.mock.calls[0][0];
    expect(txnCall.take).toBe(10);
  });

  it('writes a BankDataAccessLog READ entry for Transaction and BankAccount when bank data is present', async () => {
    setNoData();
    mockPrisma.bankAccount.findMany.mockResolvedValueOnce([
      {
        id: 'ba-1',
        name: 'Checking',
        mask: '1234',
        type: 'DEPOSITORY',
        subtype: 'CHECKING',
        currentBalance: 100,
        isoCurrencyCode: 'USD',
        plaidItem: { institutionName: 'Chase' },
      },
    ]);

    await request(app).get('/api/dashboard').expect(200);

    const calls = mockPrisma.bankDataAccessLog.create.mock.calls.map((c) => c[0].data);
    const resources = calls.map((d) => d.resource);
    expect(resources).toContain('BankAccount');
    expect(resources).toContain('Transaction');
    for (const d of calls) {
      expect(d.userId).toBe(TEST_USER_ID);
      expect(d.action).toBe('READ');
    }
  });

  it('always scopes Prisma queries by userId', async () => {
    setNoData();

    await request(app).get('/api/dashboard').expect(200);

    // Spot-check the bank-data queries
    expect(mockPrisma.bankAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: TEST_USER_ID }),
      }),
    );
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: TEST_USER_ID }),
      }),
    );
  });
});
