/**
 * Cross-user isolation (IDOR) test — MANDATORY per spec Section 10 T3.
 *
 * Two seeded users (A and B) each have their own PlaidItem, BankAccount, and
 * Transaction rows. We assert that requests authenticated as user A cannot
 * read or mutate user B's bank data through any of the public endpoints.
 *
 * Per spec: cross-tenant access must return 404 (NOT 403) to avoid an
 * existence oracle.
 *
 * The Prisma mock here is a tiny in-memory store keyed by userId so we can
 * exercise the real route handlers (which scope every query by userId) end
 * to end without hitting a live DB.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Express, Request } from 'express';
import request from 'supertest';

// ── Seed data ────────────────────────────────────────────────────────

const USER_A = 'user-AAA';
const USER_B = 'user-BBB';

// `[key: string]: unknown` index signatures so the rows are valid arguments to
// the generic `matchesWhere<T extends Record<string, unknown>>` helper below.
interface PlaidItemRow {
  [key: string]: unknown;
  id: string;
  userId: string;
  plaidItemId: string;
  accessTokenCiphertext: string;
  institutionName: string;
  institutionLogo?: string | null;
  status: string;
  deletedAt: Date | null;
  createdAt: Date;
}

interface BankAccountRow {
  [key: string]: unknown;
  id: string;
  userId: string;
  plaidItemId: string;
  plaidAccountId: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  currentBalance: number | null;
  availableBalance: number | null;
  isoCurrencyCode: string;
  isHidden: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}

interface TransactionRow {
  [key: string]: unknown;
  id: string;
  userId: string;
  bankAccountId: string;
  plaidTransactionId: string;
  amount: number;
  isoCurrencyCode: string;
  date: Date;
  name: string;
  merchantName: string | null;
  category: string | null;
  pending: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}

interface BillRow {
  [key: string]: unknown;
  id: string;
  userId: string;
  name: string;
  amount: number;
  frequency: string;
  status: string;
  nextDueDate: Date;
  deletedAt: Date | null;
  createdAt: Date;
  detectedTransactions?: TransactionRow[];
}

let plaidItems: PlaidItemRow[] = [];
let bankAccounts: BankAccountRow[] = [];
let transactions: TransactionRow[] = [];
let bills: BillRow[] = [];

function reseed() {
  plaidItems = [
    {
      id: 'item-A',
      userId: USER_A,
      plaidItemId: 'plaid-ext-A',
      accessTokenCiphertext: 'v1:enc(A)',
      institutionName: 'Bank of A',
      institutionLogo: null,
      status: 'ACTIVE',
      deletedAt: null,
      createdAt: new Date('2026-04-01'),
    },
    {
      id: 'item-B',
      userId: USER_B,
      plaidItemId: 'plaid-ext-B',
      accessTokenCiphertext: 'v1:enc(B)',
      institutionName: 'Bank of B',
      institutionLogo: null,
      status: 'ACTIVE',
      deletedAt: null,
      createdAt: new Date('2026-04-01'),
    },
  ];

  bankAccounts = [
    {
      id: 'acct-A',
      userId: USER_A,
      plaidItemId: 'item-A',
      plaidAccountId: 'p-acct-A',
      name: 'A Checking',
      mask: '0001',
      type: 'DEPOSITORY',
      subtype: 'CHECKING',
      currentBalance: 1000,
      availableBalance: 1000,
      isoCurrencyCode: 'USD',
      isHidden: false,
      deletedAt: null,
      createdAt: new Date('2026-04-01'),
    },
    {
      id: 'acct-B',
      userId: USER_B,
      plaidItemId: 'item-B',
      plaidAccountId: 'p-acct-B',
      name: 'B Checking',
      mask: '0002',
      type: 'DEPOSITORY',
      subtype: 'CHECKING',
      currentBalance: 9999,
      availableBalance: 9999,
      isoCurrencyCode: 'USD',
      isHidden: false,
      deletedAt: null,
      createdAt: new Date('2026-04-01'),
    },
  ];

  transactions = [
    {
      id: 'txn-A1',
      userId: USER_A,
      bankAccountId: 'acct-A',
      plaidTransactionId: 'plaid-txn-A1',
      amount: 5,
      isoCurrencyCode: 'USD',
      date: new Date('2026-04-20'),
      name: 'A coffee',
      merchantName: 'A Cafe',
      category: 'FOOD_AND_DRINK',
      pending: false,
      deletedAt: null,
      createdAt: new Date(),
    },
    {
      id: 'txn-B1',
      userId: USER_B,
      bankAccountId: 'acct-B',
      plaidTransactionId: 'plaid-txn-B1',
      amount: 1234.56,
      isoCurrencyCode: 'USD',
      date: new Date('2026-04-21'),
      name: 'B SECRET TXN',
      merchantName: 'B Secret Merchant',
      category: 'OTHER',
      pending: false,
      deletedAt: null,
      createdAt: new Date(),
    },
  ];

  bills = [
    {
      id: 'bill-B1',
      userId: USER_B,
      name: "B's confidential bill",
      amount: 100,
      frequency: 'MONTHLY',
      status: 'ACTIVE',
      nextDueDate: new Date('2026-05-01'),
      deletedAt: null,
      createdAt: new Date(),
      detectedTransactions: [transactions[1]!],
    },
  ];
}

// ── In-memory Prisma mock ───────────────────────────────────────────

function matchesWhere<T extends Record<string, unknown>>(row: T, where: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(where)) {
    if (v === null) {
      if (row[k] != null) return false;
    } else if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
      // Handle nested filters like { gte, lte, in, contains, mode, not }
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
          if ('gt' in nested && t <= (nested.gt as Date).getTime()) return false;
          if ('lt' in nested && t >= (nested.lt as Date).getTime()) return false;
        }
      } else if ('contains' in nested) {
        if (typeof cell !== 'string' || !cell.toLowerCase().includes(String(nested.contains).toLowerCase())) {
          return false;
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
  plaidItem: {
    findFirst: vi.fn(async (args: { where: Record<string, unknown> }) =>
      plaidItems.find((p) => matchesWhere(p, args.where)) ?? null,
    ),
    findUnique: vi.fn(async (args: { where: Record<string, unknown> }) =>
      plaidItems.find((p) => matchesWhere(p, args.where)) ?? null,
    ),
    findMany: vi.fn(async (args: { where: Record<string, unknown>; include?: unknown }) => {
      const items = plaidItems.filter((p) => matchesWhere(p, args.where));
      // include accounts where deletedAt:null
      return items.map((it) => ({
        ...it,
        accounts: bankAccounts.filter((a) => a.plaidItemId === it.id && a.deletedAt == null),
      }));
    }),
    update: vi.fn(async () => ({})),
    create: vi.fn(async (args: { data: PlaidItemRow }) => {
      plaidItems.push(args.data);
      return args.data;
    }),
  },
  bankAccount: {
    findFirst: vi.fn(async (args: { where: Record<string, unknown> }) =>
      bankAccounts.find((a) => matchesWhere(a, args.where)) ?? null,
    ),
    findMany: vi.fn(async (args: { where: Record<string, unknown> }) => {
      const accts = bankAccounts.filter((a) => matchesWhere(a, args.where));
      return accts.map((a) => ({
        ...a,
        plaidItem: plaidItems.find((p) => p.id === a.plaidItemId) ?? null,
      }));
    }),
    updateMany: vi.fn(async () => ({ count: 0 })),
  },
  transaction: {
    findMany: vi.fn(async (args: { where: Record<string, unknown>; take?: number; cursor?: { id: string }; skip?: number }) => {
      const filtered = transactions.filter((t) => matchesWhere(t, args.where));
      // We don't faithfully implement orderBy/cursor here — userId scoping is what matters
      let out = filtered;
      if (args.cursor) {
        const idx = out.findIndex((t) => t.id === args.cursor!.id);
        out = idx >= 0 ? out.slice(idx + (args.skip ?? 0)) : out;
      }
      if (args.take) out = out.slice(0, args.take);
      return out;
    }),
    updateMany: vi.fn(async () => ({ count: 0 })),
  },
  bill: {
    findMany: vi.fn(async (args: { where: Record<string, unknown>; include?: { detectedTransactions?: unknown } }) => {
      const filtered = bills.filter((b) => matchesWhere(b, args.where));
      if (args.include?.detectedTransactions) {
        return filtered.map((b) => ({
          ...b,
          // Honor the deletedAt:null filter inside the include
          detectedTransactions: (b.detectedTransactions ?? []).filter((t) => t.deletedAt == null),
        }));
      }
      return filtered;
    }),
  },
  task: {
    count: vi.fn().mockResolvedValue(0),
    findMany: vi.fn().mockResolvedValue([]),
  },
  subscription: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  appointment: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  reminder: {
    count: vi.fn().mockResolvedValue(0),
  },
  document: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>): Promise<unknown> => fn(mockPrisma)),
  bankDataAccessLog: {
    create: vi.fn().mockResolvedValue({ id: 'log-x' }),
  },
};

vi.mock('../../config/prisma', () => ({ prisma: mockPrisma }));

// ── Mock env / logger ───────────────────────────────────────────────

vi.mock('../../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test',
    PLAID_CLIENT_ID: 'cid',
    PLAID_SECRET: 'sec',
    PLAID_ENV: 'sandbox',
    PLAID_PRODUCTS: 'transactions',
    PLAID_COUNTRY_CODES: 'US',
    ENCRYPTION_KEY: 'a'.repeat(64),
    ENCRYPTION_KEY_VERSION: 1,
  },
}));

vi.mock('../../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── Mock rate limiters (no-op) ──────────────────────────────────────

vi.mock('../../middleware/rateLimiter', () => ({
  webhookLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  plaidSyncLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  globalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  authLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// ── Mock auth middleware: read userId from `x-test-user` header ─────

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

// ── Mock Plaid SDK wrapper + crypto + queue ─────────────────────────

vi.mock('../../services/plaid', () => ({
  createLinkToken: vi.fn(),
  exchangePublicToken: vi.fn(),
  removeItem: vi.fn().mockResolvedValue(undefined),
  verifyWebhook: vi.fn(),
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

vi.mock('../../jobs/queue', () => ({
  enqueuePlaidJob: vi.fn().mockResolvedValue({ id: 'job-iso' }),
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
  const transactionsRouter = (await import('../../routes/transactions')).default;
  const accountsRouter = (await import('../../routes/accounts')).default;
  const billsRouter = (await import('../../routes/bills')).default;
  const dashboardRouter = (await import('../../routes/dashboard')).default;
  app.use('/api/plaid', plaidRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/accounts', accountsRouter);
  app.use('/api/bills', billsRouter);
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

// ── Tests ───────────────────────────────────────────────────────────

describe('Cross-user isolation (IDOR) — user A cannot reach user B', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    reseed();
    app = await createApp();
  });

  it('GET /api/plaid/items returns only user A items', async () => {
    const res = await request(app)
      .get('/api/plaid/items')
      .set('x-test-user', USER_A)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('item-A');
    expect(res.body.data.find((i: { id: string }) => i.id === 'item-B')).toBeUndefined();
    // Ciphertext stripped from response
    expect(res.body.data[0].accessTokenCiphertext).toBeUndefined();
  });

  it('DELETE /api/plaid/:id for user B item as user A returns 404 (not 403)', async () => {
    const res = await request(app)
      .delete('/api/plaid/item-B')
      .set('x-test-user', USER_A)
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
    // Ensure we did NOT actually mutate item-B
    expect(plaidItems.find((p) => p.id === 'item-B')?.deletedAt).toBeNull();
  });

  it('POST /api/plaid/:id/sync for user B item as user A returns 404 (not 403)', async () => {
    const res = await request(app)
      .post('/api/plaid/item-B/sync')
      .set('x-test-user', USER_A)
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
    const { enqueuePlaidJob } = await import('../../jobs/queue');
    expect(enqueuePlaidJob).not.toHaveBeenCalled();
  });

  it('GET /api/transactions?accountId=<userBaccount> as user A returns 404 (cannot see B exists)', async () => {
    const res = await request(app)
      .get('/api/transactions?accountId=acct-B')
      .set('x-test-user', USER_A)
      .expect(404);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/transactions (no filter) as user A never returns user B txns', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set('x-test-user', USER_A)
      .expect(200);

    const ids = (res.body.data.items as Array<{ id: string; userId: string }>).map((t) => t.id);
    expect(ids).toContain('txn-A1');
    expect(ids).not.toContain('txn-B1');
    // Defense in depth: every item has userId === USER_A
    for (const item of res.body.data.items as Array<{ userId: string }>) {
      expect(item.userId).toBe(USER_A);
    }
  });

  it('GET /api/accounts as user A returns only A accounts', async () => {
    const res = await request(app)
      .get('/api/accounts')
      .set('x-test-user', USER_A)
      .expect(200);

    const ids = (res.body.data as Array<{ id: string; userId: string }>).map((a) => a.id);
    expect(ids).toEqual(['acct-A']);
    expect(ids).not.toContain('acct-B');
  });

  it('GET /api/bills?includeTransactions=true as user A does NOT include user B txns', async () => {
    const res = await request(app)
      .get('/api/bills?includeTransactions=true')
      .set('x-test-user', USER_A)
      .expect(200);

    const billsResp = res.body.data as Array<{ id: string; detectedTransactions?: Array<{ id: string }> }>;
    // No bills for user A in the seed; user B's bill must NOT appear
    expect(billsResp.find((b) => b.id === 'bill-B1')).toBeUndefined();
    for (const b of billsResp) {
      for (const t of b.detectedTransactions ?? []) {
        expect(t.id).not.toBe('txn-B1');
      }
    }
  });

  it('GET /api/dashboard as user A does NOT include user B accounts/transactions', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('x-test-user', USER_A)
      .expect(200);

    const conn = res.body.data.connectedAccounts;
    expect(conn.count).toBe(1);
    expect(conn.accounts.map((a: { id: string }) => a.id)).toEqual(['acct-A']);

    const recents = res.body.data.recentTransactions as Array<{ id: string }>;
    expect(recents.find((t) => t.id === 'txn-B1')).toBeUndefined();
    expect(recents.find((t) => t.id === 'txn-A1')).toBeDefined();
  });

  it('user B can still see their own data (sanity check — isolation cuts both ways)', async () => {
    const res = await request(app)
      .get('/api/plaid/items')
      .set('x-test-user', USER_B)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('item-B');
  });
});
