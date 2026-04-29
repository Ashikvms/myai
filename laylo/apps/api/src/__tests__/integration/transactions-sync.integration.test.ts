import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock env / logger ───────────────────────────────────────────────

vi.mock('../../config/env', () => ({
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

vi.mock('../../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── Mock Prisma ─────────────────────────────────────────────────────

interface TxnRow {
  id: string;
  plaidTransactionId: string;
  userId: string;
  bankAccountId: string;
  amount?: unknown;
  date?: Date;
  name?: string;
}

const txnStore: Map<string, TxnRow> = new Map();
const itemUpdates: Array<{ where: { id: string }; data: Record<string, unknown> }> = [];

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
    update: vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      itemUpdates.push(args);
      return {};
    }),
  },
};

const mockPrisma = {
  plaidItem: {
    findUnique: vi.fn(),
    update: vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      itemUpdates.push(args);
      return {};
    }),
  },
  $transaction: vi.fn(async (fn: (tx: typeof txClient) => Promise<unknown>) => fn(txClient)),
  bankDataAccessLog: {
    create: vi.fn().mockResolvedValue({ id: 'log-1' }),
  },
};

vi.mock('../../config/prisma', () => ({ prisma: mockPrisma }));

// ── Mock crypto ─────────────────────────────────────────────────────

vi.mock('../../services/crypto', () => ({
  decryptAccessToken: (s: string) => `decrypted:${s}`,
  CryptoError: class CryptoError extends Error {},
}));

// ── Mock Plaid SDK wrapper ──────────────────────────────────────────

const mockTransactionsSync = vi.fn();
vi.mock('../../services/plaid', () => ({
  transactionsSync: (...args: unknown[]) => mockTransactionsSync(...args),
  PlaidError: class PlaidError extends Error {
    code: string;
    constructor(msg: string, opts: { code: string }) {
      super(msg);
      this.code = opts.code;
    }
  },
}));

// ── Fixture: a connected item with two accounts ─────────────────────

const fakeItem = {
  id: 'pi-int-1',
  userId: 'u-int-1',
  cursor: null,
  deletedAt: null,
  accessTokenCiphertext: 'v1:fake-encrypted',
  accounts: [
    { id: 'ba-int-1', plaidAccountId: 'plaid-acct-A' },
    { id: 'ba-int-2', plaidAccountId: 'plaid-acct-B' },
  ],
};

function plaidTxn(overrides: Partial<{ transaction_id: string; account_id: string; amount: number; date: string; name: string }>) {
  return {
    transaction_id: overrides.transaction_id ?? 'tx-x',
    account_id: overrides.account_id ?? 'plaid-acct-A',
    amount: overrides.amount ?? 5,
    date: overrides.date ?? '2026-04-15',
    name: overrides.name ?? 'Test',
    pending: false,
    iso_currency_code: 'USD',
    personal_finance_category: { primary: 'GENERAL_MERCHANDISE', detailed: 'X' },
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('transaction-sync — full sync loop (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txnStore.clear();
    itemUpdates.length = 0;
  });

  it('iterates while has_more=true, advances cursor, exits when has_more=false', async () => {
    mockPrisma.plaidItem.findUnique.mockResolvedValueOnce(fakeItem);

    mockTransactionsSync
      .mockResolvedValueOnce({
        added: [plaidTxn({ transaction_id: 'p1' })],
        modified: [],
        removed: [],
        hasMore: true,
        nextCursor: 'cursor-1',
      })
      .mockResolvedValueOnce({
        added: [plaidTxn({ transaction_id: 'p2' })],
        modified: [],
        removed: [],
        hasMore: true,
        nextCursor: 'cursor-2',
      })
      .mockResolvedValueOnce({
        added: [plaidTxn({ transaction_id: 'p3', account_id: 'plaid-acct-B' })],
        modified: [plaidTxn({ transaction_id: 'p1', amount: 99 })],
        removed: [],
        hasMore: false,
        nextCursor: 'cursor-final',
      });

    const { syncItem } = await import('../../services/transaction-sync');
    const result = await syncItem('pi-int-1');

    expect(mockTransactionsSync).toHaveBeenCalledTimes(3);
    // Cursor advance: undefined → cursor-1 → cursor-2
    expect(mockTransactionsSync.mock.calls[0][1]).toBeUndefined();
    expect(mockTransactionsSync.mock.calls[1][1]).toBe('cursor-1');
    expect(mockTransactionsSync.mock.calls[2][1]).toBe('cursor-2');

    expect(result.added).toBe(3);
    expect(result.modified).toBe(1);
    expect(result.removed).toBe(0);

    // Final cursor persisted (search from the end)
    let finalUpdate: { where: { id: string }; data: Record<string, unknown> } | undefined;
    for (let i = itemUpdates.length - 1; i >= 0; i--) {
      const u = itemUpdates[i]!;
      if (u.data.cursor === 'cursor-final') {
        finalUpdate = u;
        break;
      }
    }
    expect(finalUpdate).toBeDefined();
    expect(finalUpdate!.data.status).toBe('ACTIVE');
  });

  it('upserts added/modified and hard-deletes removed rows', async () => {
    mockPrisma.plaidItem.findUnique.mockResolvedValueOnce(fakeItem);

    // Pre-seed a transaction to be removed
    txnStore.set('tx-removed', {
      id: 'old-internal',
      plaidTransactionId: 'tx-removed',
      userId: 'u-int-1',
      bankAccountId: 'ba-int-1',
    });

    mockTransactionsSync.mockResolvedValueOnce({
      added: [plaidTxn({ transaction_id: 'tx-new', name: 'Brand new' })],
      modified: [plaidTxn({ transaction_id: 'tx-existing', amount: 12.5 })],
      removed: [{ transaction_id: 'tx-removed' }],
      hasMore: false,
      nextCursor: 'cursor-1',
    });

    const { syncItem } = await import('../../services/transaction-sync');
    await syncItem('pi-int-1');

    // tx-new upserted
    expect(txnStore.has('tx-new')).toBe(true);
    // tx-existing upserted
    expect(txnStore.has('tx-existing')).toBe(true);
    // tx-removed deleted
    expect(txnStore.has('tx-removed')).toBe(false);

    expect(txClient.transaction.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'u-int-1',
        plaidTransactionId: { in: ['tx-removed'] },
      },
    });
  });

  it('on ITEM_LOGIN_REQUIRED, sets PlaidItem.status = LOGIN_REQUIRED with errorCode/errorMessage', async () => {
    mockPrisma.plaidItem.findUnique.mockResolvedValueOnce(fakeItem);
    const { PlaidError } = await import('../../services/plaid');
    mockTransactionsSync.mockRejectedValueOnce(
      new PlaidError('Login required', { code: 'ITEM_LOGIN_REQUIRED' }),
    );

    const { syncItem } = await import('../../services/transaction-sync');
    await expect(syncItem('pi-int-1')).rejects.toBeInstanceOf(PlaidError);

    expect(mockPrisma.plaidItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pi-int-1' },
        data: expect.objectContaining({
          status: 'LOGIN_REQUIRED',
          errorCode: 'ITEM_LOGIN_REQUIRED',
          errorMessage: 'Login required',
        }),
      }),
    );
  });

  it('on generic PlaidError (non-LOGIN_REQUIRED), sets status = ERROR', async () => {
    mockPrisma.plaidItem.findUnique.mockResolvedValueOnce(fakeItem);
    const { PlaidError } = await import('../../services/plaid');
    mockTransactionsSync.mockRejectedValueOnce(
      new PlaidError('Rate limited by Plaid', { code: 'RATE_LIMIT_EXCEEDED' }),
    );

    const { syncItem } = await import('../../services/transaction-sync');
    await expect(syncItem('pi-int-1')).rejects.toBeInstanceOf(PlaidError);

    expect(mockPrisma.plaidItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pi-int-1' },
        data: expect.objectContaining({
          status: 'ERROR',
          errorCode: 'RATE_LIMIT_EXCEEDED',
        }),
      }),
    );
  });

  it('persists cursor + writes audit log on successful run', async () => {
    mockPrisma.plaidItem.findUnique.mockResolvedValueOnce(fakeItem);
    mockTransactionsSync.mockResolvedValueOnce({
      added: [plaidTxn({ transaction_id: 'a1' })],
      modified: [],
      removed: [],
      hasMore: false,
      nextCursor: 'cursor-final-1',
    });

    const { syncItem } = await import('../../services/transaction-sync');
    await syncItem('pi-int-1');

    // Audit log written for SYNC. QA5: a per-page log is emitted inside the
    // sync loop AND a final summary log is emitted at the end. We assert
    // both: the summary (last call) carries the totals; the per-page call
    // (first) carries the page index + per-page counts.
    expect(mockPrisma.bankDataAccessLog.create).toHaveBeenCalled();
    const calls = mockPrisma.bankDataAccessLog.create.mock.calls;
    const summary = calls[calls.length - 1][0];
    expect(summary.data.action).toBe('SYNC');
    expect(summary.data.resource).toBe('PlaidItem');
    expect(summary.data.resourceId).toBe('pi-int-1');
    expect(summary.data.context).toEqual(
      expect.objectContaining({ added: 1, modified: 0, removed: 0 }),
    );
    const perPage = calls[0][0];
    expect(perPage.data.context).toEqual(
      expect.objectContaining({ pageIndex: 1 }),
    );
  });

  it('skips silently when item is soft-deleted', async () => {
    mockPrisma.plaidItem.findUnique.mockResolvedValueOnce({
      ...fakeItem,
      deletedAt: new Date(),
    });

    const { syncItem } = await import('../../services/transaction-sync');
    const result = await syncItem('pi-int-1');

    expect(result).toEqual({ added: 0, modified: 0, removed: 0 });
    expect(mockTransactionsSync).not.toHaveBeenCalled();
  });

  it('does not double-sync the same cursor on consecutive calls', async () => {
    mockPrisma.plaidItem.findUnique.mockResolvedValueOnce({
      ...fakeItem,
      cursor: 'previously-saved-cursor',
    });
    mockTransactionsSync.mockResolvedValueOnce({
      added: [],
      modified: [],
      removed: [],
      hasMore: false,
      nextCursor: 'previously-saved-cursor',
    });

    const { syncItem } = await import('../../services/transaction-sync');
    await syncItem('pi-int-1');

    // The first call to /transactions/sync should pass the saved cursor, not undefined
    expect(mockTransactionsSync).toHaveBeenCalledTimes(1);
    expect(mockTransactionsSync.mock.calls[0][1]).toBe('previously-saved-cursor');
  });
});
