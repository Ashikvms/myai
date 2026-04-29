import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock env ────────────────────────────────────────────────────────

vi.mock('../config/env', () => ({
  env: {
    ENCRYPTION_KEY: 'a'.repeat(64),
    ENCRYPTION_KEY_VERSION: 1,
    PLAID_CLIENT_ID: 'cid',
    PLAID_SECRET: 'sec',
    PLAID_ENV: 'sandbox',
    PLAID_PRODUCTS: 'transactions',
    PLAID_COUNTRY_CODES: 'US',
  },
}));

vi.mock('../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── Mock Prisma ─────────────────────────────────────────────────────

interface TxnRow {
  id: string;
  plaidTransactionId: string;
  userId: string;
  bankAccountId: string;
}

const txnStore: Map<string, TxnRow> = new Map();

const txClient = {
  transaction: {
    upsert: vi.fn(async (args: { where: { plaidTransactionId: string }; create: TxnRow; update: TxnRow }) => {
      txnStore.set(args.where.plaidTransactionId, {
        ...(args.create as TxnRow),
        plaidTransactionId: args.where.plaidTransactionId,
      });
      return args.create;
    }),
    deleteMany: vi.fn(async (args: { where: { plaidTransactionId?: { in: string[] } } }) => {
      const ids = args.where.plaidTransactionId?.in ?? [];
      let count = 0;
      for (const id of ids) {
        if (txnStore.delete(id)) count += 1;
      }
      return { count };
    }),
  },
  plaidItem: {
    update: vi.fn(async () => ({})),
  },
};

const mockPrisma = {
  plaidItem: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(async (fn: (tx: typeof txClient) => Promise<unknown>) => fn(txClient)),
  bankDataAccessLog: {
    create: vi.fn().mockResolvedValue({ id: 'log-1' }),
  },
};
vi.mock('../config/prisma', () => ({ prisma: mockPrisma }));

// ── Mock crypto ─────────────────────────────────────────────────────

vi.mock('../services/crypto', () => ({
  decryptAccessToken: (s: string) => `decrypted:${s}`,
  CryptoError: class CryptoError extends Error {},
}));

// ── Mock plaid SDK wrapper ──────────────────────────────────────────

const mockTransactionsSync = vi.fn();
vi.mock('../services/plaid', () => ({
  transactionsSync: (...args: unknown[]) => mockTransactionsSync(...args),
  PlaidError: class PlaidError extends Error {
    code: string;
    constructor(msg: string, opts: { code: string }) {
      super(msg);
      this.code = opts.code;
    }
  },
}));

// ── Tests ───────────────────────────────────────────────────────────

const fakeItem = {
  id: 'pi-1',
  userId: 'u-1',
  cursor: null,
  deletedAt: null,
  accessTokenCiphertext: 'v1:fake',
  accounts: [
    { id: 'ba-1', plaidAccountId: 'plaid-acct-1' },
    { id: 'ba-2', plaidAccountId: 'plaid-acct-2' },
  ],
};

describe('transaction-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txnStore.clear();
  });

  it('upserts added, deletes removed, and persists the new cursor', async () => {
    mockPrisma.plaidItem.findUnique.mockResolvedValueOnce(fakeItem);

    mockTransactionsSync.mockResolvedValueOnce({
      added: [
        {
          transaction_id: 'tx-1',
          account_id: 'plaid-acct-1',
          amount: 12.34,
          date: '2026-04-01',
          name: 'Coffee shop',
          merchant_name: 'Blue Bottle',
          payment_channel: 'in store',
          pending: false,
          iso_currency_code: 'USD',
          personal_finance_category: { primary: 'FOOD_AND_DRINK', detailed: 'COFFEE' },
        },
      ],
      modified: [],
      removed: [{ transaction_id: 'tx-old' }],
      hasMore: false,
      nextCursor: 'cursor-AAA',
    });

    // Pre-seed the store with the about-to-be-removed transaction
    txnStore.set('tx-old', {
      id: 'old',
      plaidTransactionId: 'tx-old',
      userId: 'u-1',
      bankAccountId: 'ba-1',
    });

    const { syncItem } = await import('../services/transaction-sync');
    const result = await syncItem('pi-1');

    expect(result.added).toBe(1);
    expect(result.removed).toBe(1);
    expect(result.modified).toBe(0);

    expect(txClient.transaction.upsert).toHaveBeenCalled();
    const upsertArg = txClient.transaction.upsert.mock.calls[0]?.[0];
    expect(upsertArg).toBeDefined();
    expect(upsertArg!.where.plaidTransactionId).toBe('tx-1');
    // userId is denormalised onto Transaction
    expect(upsertArg!.create.userId).toBe('u-1');
    expect(upsertArg!.create.bankAccountId).toBe('ba-1');

    expect(txClient.transaction.deleteMany).toHaveBeenCalled();
    expect(txClient.plaidItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pi-1' },
        data: expect.objectContaining({ cursor: 'cursor-AAA', status: 'ACTIVE' }),
      }),
    );

    expect(mockPrisma.bankDataAccessLog.create).toHaveBeenCalled();
  });

  it('iterates while has_more=true and stops when false', async () => {
    mockPrisma.plaidItem.findUnique.mockResolvedValueOnce(fakeItem);

    mockTransactionsSync
      .mockResolvedValueOnce({
        added: [
          {
            transaction_id: 'p1-tx',
            account_id: 'plaid-acct-1',
            amount: 1,
            date: '2026-04-01',
            name: 'A',
            pending: false,
            personal_finance_category: { primary: 'X', detailed: 'X' },
          },
        ],
        modified: [],
        removed: [],
        hasMore: true,
        nextCursor: 'c1',
      })
      .mockResolvedValueOnce({
        added: [],
        modified: [
          {
            transaction_id: 'p1-tx',
            account_id: 'plaid-acct-1',
            amount: 2,
            date: '2026-04-02',
            name: 'A2',
            pending: false,
            personal_finance_category: { primary: 'X', detailed: 'X' },
          },
        ],
        removed: [],
        hasMore: false,
        nextCursor: 'c2',
      });

    const { syncItem } = await import('../services/transaction-sync');
    const result = await syncItem('pi-1');

    expect(mockTransactionsSync).toHaveBeenCalledTimes(2);
    expect(mockTransactionsSync.mock.calls[0][1]).toBeUndefined();
    expect(mockTransactionsSync.mock.calls[1][1]).toBe('c1');
    expect(result.added).toBe(1);
    expect(result.modified).toBe(1);
  });

  it('marks the item LOGIN_REQUIRED when Plaid raises ITEM_LOGIN_REQUIRED', async () => {
    mockPrisma.plaidItem.findUnique.mockResolvedValueOnce(fakeItem);
    const { PlaidError } = await import('../services/plaid');
    mockTransactionsSync.mockRejectedValueOnce(
      new PlaidError('Login required', { code: 'ITEM_LOGIN_REQUIRED' }),
    );

    const { syncItem } = await import('../services/transaction-sync');
    await expect(syncItem('pi-1')).rejects.toBeInstanceOf(PlaidError);

    expect(mockPrisma.plaidItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pi-1' },
        data: expect.objectContaining({
          status: 'LOGIN_REQUIRED',
          errorCode: 'ITEM_LOGIN_REQUIRED',
        }),
      }),
    );
  });

  it('skips silently when the item is soft-deleted', async () => {
    mockPrisma.plaidItem.findUnique.mockResolvedValueOnce({
      ...fakeItem,
      deletedAt: new Date(),
    });
    const { syncItem } = await import('../services/transaction-sync');
    const result = await syncItem('pi-1');
    expect(result).toEqual({ added: 0, modified: 0, removed: 0 });
    expect(mockTransactionsSync).not.toHaveBeenCalled();
  });
});
