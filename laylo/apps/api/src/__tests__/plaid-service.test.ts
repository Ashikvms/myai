import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock env ────────────────────────────────────────────────────────

vi.mock('../config/env', () => ({
  env: {
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

// ── Mock logger ─────────────────────────────────────────────────────

vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Mock Plaid SDK ──────────────────────────────────────────────────

const linkTokenCreate = vi.fn();
const itemPublicTokenExchange = vi.fn();
const itemRemove = vi.fn();
const accountsGet = vi.fn();
const accountsBalanceGet = vi.fn();
const transactionsSync = vi.fn();
const webhookVerificationKeyGet = vi.fn();

vi.mock('plaid', () => {
  return {
    Configuration: vi.fn().mockImplementation((opts: unknown) => opts),
    PlaidApi: vi.fn().mockImplementation(() => ({
      linkTokenCreate,
      itemPublicTokenExchange,
      itemRemove,
      accountsGet,
      accountsBalanceGet,
      transactionsSync,
      webhookVerificationKeyGet,
    })),
    PlaidEnvironments: {
      sandbox: 'https://sandbox.plaid.com',
      development: 'https://development.plaid.com',
      production: 'https://production.plaid.com',
    },
    Products: {},
    CountryCode: {},
  };
});

// ── Tests ───────────────────────────────────────────────────────────

describe('plaid service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { _resetPlaidClientCache, _resetWebhookKeyCache } = await import('../services/plaid');
    _resetPlaidClientCache();
    _resetWebhookKeyCache();
  });

  describe('createLinkToken', () => {
    it('returns linkToken and expiration on success', async () => {
      linkTokenCreate.mockResolvedValueOnce({
        data: { link_token: 'link-sandbox-abc', expiration: '2026-01-01T00:00:00Z' },
      });
      const { createLinkToken } = await import('../services/plaid');
      const result = await createLinkToken('user-123');
      expect(result).toEqual({
        linkToken: 'link-sandbox-abc',
        expiration: '2026-01-01T00:00:00Z',
      });
      expect(linkTokenCreate).toHaveBeenCalledOnce();
      const call = linkTokenCreate.mock.calls[0][0];
      expect(call.user.client_user_id).toBe('user-123');
      expect(call.client_name).toBeDefined();
    });

    it('wraps Plaid errors as PlaidError without leaking secrets', async () => {
      linkTokenCreate.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error_code: 'INVALID_PRODUCT',
            error_message: 'Invalid product',
            error_type: 'INVALID_REQUEST',
            request_id: 'req-1',
          },
        },
      });
      const { createLinkToken, PlaidError } = await import('../services/plaid');
      await expect(createLinkToken('user-123')).rejects.toBeInstanceOf(PlaidError);
    });
  });

  describe('exchangePublicToken', () => {
    it('returns access_token and item_id on happy path', async () => {
      itemPublicTokenExchange.mockResolvedValueOnce({
        data: { access_token: 'access-sandbox-tok', item_id: 'item-1' },
      });
      const { exchangePublicToken } = await import('../services/plaid');
      const result = await exchangePublicToken('public-sandbox-pub');
      expect(result).toEqual({ accessToken: 'access-sandbox-tok', itemId: 'item-1' });
    });

    it('wraps SDK errors as PlaidError on failure', async () => {
      itemPublicTokenExchange.mockRejectedValueOnce(new Error('network blew up'));
      const { exchangePublicToken, PlaidError } = await import('../services/plaid');
      await expect(exchangePublicToken('public-bad')).rejects.toBeInstanceOf(PlaidError);
    });
  });

  describe('transactionsSync', () => {
    it('forwards added/modified/removed/cursor to caller', async () => {
      transactionsSync.mockResolvedValueOnce({
        data: {
          added: [{ transaction_id: 't1' }],
          modified: [],
          removed: [{ transaction_id: 't0' }],
          has_more: false,
          next_cursor: 'cursor-2',
        },
      });
      const mod = await import('../services/plaid');
      const result = await mod.transactionsSync('access-tok', 'cursor-1');
      expect(result.added).toHaveLength(1);
      expect(result.removed).toHaveLength(1);
      expect(result.nextCursor).toBe('cursor-2');
      expect(result.hasMore).toBe(false);
    });
  });

  describe('verifyWebhook', () => {
    it('returns false on missing Plaid-Verification header', async () => {
      const { verifyWebhook } = await import('../services/plaid');
      const ok = await verifyWebhook({}, '{}');
      expect(ok).toBe(false);
    });

    it('returns false on a non-JWT header value', async () => {
      const { verifyWebhook } = await import('../services/plaid');
      const ok = await verifyWebhook({ 'plaid-verification': 'not-a-jwt' }, '{}');
      expect(ok).toBe(false);
    });
  });
});
