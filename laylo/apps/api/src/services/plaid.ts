import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  type AccountBase,
  type Transaction as PlaidTransaction,
  type RemovedTransaction,
} from 'plaid';
import { jwtVerify, type JWTPayload } from 'jose';
import { env } from '../config/env';
import { logger } from '../config/logger';

// ── Errors ─────────────────────────────────────────────────────────

export class PlaidError extends Error {
  public readonly code: string;
  public readonly httpStatus?: number;
  public readonly requestId?: string;
  public readonly plaidErrorType?: string;

  constructor(
    message: string,
    opts: { code: string; httpStatus?: number; requestId?: string; plaidErrorType?: string } = {
      code: 'PLAID_ERROR',
    },
  ) {
    super(message);
    this.name = 'PlaidError';
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
    this.requestId = opts.requestId;
    this.plaidErrorType = opts.plaidErrorType;
  }
}

// ── Client construction (lazy so env validation runs first) ────────

let cachedClient: PlaidApi | null = null;

function client(): PlaidApi {
  if (cachedClient) return cachedClient;

  const basePath = PlaidEnvironments[env.PLAID_ENV];
  const config = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID,
        'PLAID-SECRET': env.PLAID_SECRET,
        'Plaid-Version': '2020-09-14',
      },
    },
  });
  cachedClient = new PlaidApi(config);
  return cachedClient;
}

/**
 * Test-only: drop the cached SDK client so a re-mocked env applies.
 */
export function _resetPlaidClientCache(): void {
  cachedClient = null;
}

// ── Helpers ───────────────────────────────────────────────────────

function parseProducts(): Products[] {
  return env.PLAID_PRODUCTS.split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p as Products);
}

function parseCountryCodes(): CountryCode[] {
  return env.PLAID_COUNTRY_CODES.split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => c as CountryCode);
}

/**
 * Wrap a Plaid SDK call so its errors never leak access tokens or secrets.
 */
async function safeCall<T>(name: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const e = err as {
      response?: { status?: number; data?: { error_code?: string; error_message?: string; error_type?: string; request_id?: string } };
      message?: string;
    };
    const data = e?.response?.data;
    const code = data?.error_code ?? 'PLAID_ERROR';
    const message = data?.error_message ?? e?.message ?? 'Unknown Plaid error';

    logger.warn('Plaid SDK call failed', {
      operation: name,
      code,
      requestId: data?.request_id,
      errorType: data?.error_type,
    });

    throw new PlaidError(message, {
      code,
      httpStatus: e?.response?.status,
      requestId: data?.request_id,
      plaidErrorType: data?.error_type,
    });
  }
}

// ── Public API ─────────────────────────────────────────────────────

export interface CreateLinkTokenResult {
  linkToken: string;
  expiration: string;
}

export async function createLinkToken(
  userId: string,
  redirectUri?: string,
): Promise<CreateLinkTokenResult> {
  return safeCall('link/token/create', async () => {
    const res = await client().linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Beedo',
      products: parseProducts(),
      country_codes: parseCountryCodes(),
      language: 'en',
      webhook: env.PLAID_WEBHOOK_URL,
      redirect_uri: redirectUri ?? env.PLAID_REDIRECT_URI,
    });
    return {
      linkToken: res.data.link_token,
      expiration: res.data.expiration,
    };
  });
}

export interface ExchangePublicTokenResult {
  accessToken: string;
  itemId: string;
}

export async function exchangePublicToken(
  publicToken: string,
): Promise<ExchangePublicTokenResult> {
  return safeCall('item/public_token/exchange', async () => {
    const res = await client().itemPublicTokenExchange({
      public_token: publicToken,
    });
    return {
      accessToken: res.data.access_token,
      itemId: res.data.item_id,
    };
  });
}

export async function removeItem(accessToken: string): Promise<void> {
  await safeCall('item/remove', async () => {
    await client().itemRemove({ access_token: accessToken });
  });
}

export async function getAccounts(accessToken: string): Promise<AccountBase[]> {
  return safeCall('accounts/get', async () => {
    const res = await client().accountsGet({ access_token: accessToken });
    return res.data.accounts;
  });
}

export async function getBalances(accessToken: string): Promise<AccountBase[]> {
  return safeCall('accounts/balance/get', async () => {
    const res = await client().accountsBalanceGet({ access_token: accessToken });
    return res.data.accounts;
  });
}

export interface TransactionsSyncResult {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: RemovedTransaction[];
  hasMore: boolean;
  nextCursor: string;
}

export async function transactionsSync(
  accessToken: string,
  cursor?: string,
): Promise<TransactionsSyncResult> {
  return safeCall('transactions/sync', async () => {
    const res = await client().transactionsSync({
      access_token: accessToken,
      cursor: cursor ?? undefined,
    });
    return {
      added: res.data.added,
      modified: res.data.modified,
      removed: res.data.removed,
      hasMore: res.data.has_more,
      nextCursor: res.data.next_cursor,
    };
  });
}

// ── Webhook verification ──────────────────────────────────────────

// Plaid uses `/webhook_verification_key/get` (keyed by `kid`) rather than a
// true JWKS endpoint, so we hand-roll a small key cache. Keys are cached
// for 24h, matching Plaid's documented rotation window.
interface CachedKey {
  jwk: Record<string, unknown>;
  expiresAt: number;
}
const keyCache = new Map<string, CachedKey>();
const KEY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_IAT_SKEW_MS = 5 * 60 * 1000;

/**
 * Test-only: clear the JWKS cache between tests.
 */
export function _resetWebhookKeyCache(): void {
  keyCache.clear();
}

async function fetchVerificationKey(kid: string): Promise<Record<string, unknown> | null> {
  const cached = keyCache.get(kid);
  if (cached && cached.expiresAt > Date.now()) return cached.jwk;

  try {
    const res = await safeCall('webhook_verification_key/get', async () => {
      return client().webhookVerificationKeyGet({ key_id: kid });
    });
    const jwk = (res.data as unknown as { key: Record<string, unknown> }).key;
    if (!jwk) return null;
    keyCache.set(kid, { jwk, expiresAt: Date.now() + KEY_TTL_MS });
    return jwk;
  } catch (err) {
    logger.warn('Failed to fetch Plaid webhook verification key', {
      kid,
      error: (err as Error).message,
    });
    return null;
  }
}

/**
 * Verify the `Plaid-Verification` JWT header signs the raw request body.
 * Returns true on success; false on any failure (missing header, bad sig,
 * stale `iat`, body hash mismatch).
 */
export async function verifyWebhook(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string,
): Promise<boolean> {
  try {
    const headerVal = headers['plaid-verification'] ?? headers['Plaid-Verification'];
    const token = Array.isArray(headerVal) ? headerVal[0] : headerVal;
    if (!token || typeof token !== 'string') return false;

    // Decode header to extract `kid` (without trusting the payload yet)
    const [headerB64] = token.split('.');
    if (!headerB64) return false;
    const headerJson = JSON.parse(
      Buffer.from(headerB64, 'base64url').toString('utf8'),
    ) as { kid?: string; alg?: string };
    if (!headerJson.kid || headerJson.alg !== 'ES256') return false;

    const jwk = await fetchVerificationKey(headerJson.kid);
    if (!jwk) return false;

    // Use jose to verify the signature with ES256
    const { importJWK } = await import('jose');
    const key = await importJWK(jwk as unknown as Parameters<typeof importJWK>[0], 'ES256');

    let payload: JWTPayload;
    try {
      const verified = await jwtVerify(token, key, { algorithms: ['ES256'] });
      payload = verified.payload;
    } catch {
      return false;
    }

    // iat freshness check
    const iat = typeof payload.iat === 'number' ? payload.iat * 1000 : 0;
    if (!iat || Math.abs(Date.now() - iat) > MAX_IAT_SKEW_MS) return false;

    // Body integrity: `request_body_sha256` claim must equal SHA-256 of raw body.
    const claimed = (payload as { request_body_sha256?: string }).request_body_sha256;
    if (!claimed) return false;

    const { createHash } = await import('node:crypto');
    const computed = createHash('sha256').update(rawBody, 'utf8').digest('hex');
    if (claimed !== computed) return false;

    return true;
  } catch (err) {
    logger.warn('Webhook verification raised', { error: (err as Error).message });
    return false;
  }
}

// Re-export selected SDK types for convenience.
export { PlaidEnvironments, Products, CountryCode };
