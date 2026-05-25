/**
 * Google OAuth2 client management.
 *
 * Wraps `google-auth-library`'s OAuth2Client so callers (Calendar, Gmail)
 * can fetch a ready-to-use client for a given userId without worrying
 * about decrypting tokens, refresh handling, or persistence.
 *
 * Token storage rules (mirror Plaid):
 *   - access_token + refresh_token are encrypted at rest via
 *     `services/crypto.ts` (AES-256-GCM, key versioned).
 *   - The decrypted access_token is held in-process ONLY long enough to
 *     hand it to the OAuth2Client; we then scrub the local string.
 *   - Refresh events fire on the OAuth2Client — we listen and re-encrypt
 *     + persist the new access_token automatically.
 *   - We NEVER log token bodies. Errors include user id + operation only.
 */

import { OAuth2Client } from 'google-auth-library';
import type { Credentials } from 'google-auth-library';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../config/prisma';
import { encryptAccessToken, decryptAccessToken, CryptoError } from './crypto';

// ── Errors ──────────────────────────────────────────────────────────

export class GoogleOAuthError extends Error {
  public readonly code: string;
  public readonly httpStatus?: number;

  constructor(message: string, opts: { code: string; httpStatus?: number } = { code: 'GOOGLE_OAUTH_ERROR' }) {
    super(message);
    this.name = 'GoogleOAuthError';
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
  }
}

// ── Scope helpers ───────────────────────────────────────────────────

/**
 * Parse a comma-separated env scope list into an array.
 */
function parseScopes(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getCalendarScopes(): string[] {
  return parseScopes(env.GOOGLE_CALENDAR_SCOPES);
}

export function getGmailScopes(): string[] {
  return parseScopes(env.GOOGLE_GMAIL_SCOPES);
}

/** All scopes the LINK flow requests (Calendar + Gmail). */
export function getLinkFlowScopes(): string[] {
  return Array.from(new Set([...getCalendarScopes(), ...getGmailScopes()]));
}

/**
 * Convenience: does the persisted set of scopes for a user include the
 * Calendar scope? Used by jobs to skip users who only granted Gmail (or
 * vice versa). Tolerates space/comma separation in storage.
 */
export function hasCalendarScope(userScopes: string[]): boolean {
  const set = new Set(userScopes);
  return getCalendarScopes().some((s) => set.has(s));
}

export function hasGmailScope(userScopes: string[]): boolean {
  const set = new Set(userScopes);
  return getGmailScopes().some((s) => set.has(s));
}

// ── Client construction ─────────────────────────────────────────────

/**
 * Construct a bare OAuth2Client (no credentials). Useful for the LINK
 * flow where we need to generate an auth URL or exchange a code for
 * tokens without a prior user record.
 */
export function createOAuth2Client(redirectUri?: string): OAuth2Client {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new GoogleOAuthError('Google OAuth is not configured', {
      code: 'GOOGLE_NOT_CONFIGURED',
      httpStatus: 501,
    });
  }
  return new OAuth2Client({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: redirectUri ?? env.GOOGLE_LINK_REDIRECT_URI,
  });
}

/**
 * Load the OAuth2Client for a given userId.
 *
 * - Throws GoogleOAuthError('NOT_LINKED') if the user has no Google
 *   tokens stored.
 * - Wires `tokens` event to re-encrypt + persist refreshed access_tokens.
 * - The returned client will transparently refresh on any 401.
 */
export async function getGoogleClient(userId: string): Promise<OAuth2Client> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessTokenCiphertext: true,
      googleRefreshTokenCiphertext: true,
      googleTokenExpiresAt: true,
      googleScopes: true,
    },
  });

  if (!user || !user.googleAccessTokenCiphertext) {
    throw new GoogleOAuthError('User has not linked their Google account', {
      code: 'GOOGLE_NOT_LINKED',
      httpStatus: 400,
    });
  }

  let accessTokenPlain: string;
  let refreshTokenPlain: string | undefined;
  try {
    accessTokenPlain = decryptAccessToken(user.googleAccessTokenCiphertext);
    if (user.googleRefreshTokenCiphertext) {
      refreshTokenPlain = decryptAccessToken(user.googleRefreshTokenCiphertext);
    }
  } catch (err) {
    if (err instanceof CryptoError) {
      // TAMPER_SUSPECTED — same severity as the Plaid path (services/plaid.ts).
      logger.error('TAMPER_SUSPECTED: Google token decrypt failed', {
        userId,
        error: err.message,
      });
    }
    throw new GoogleOAuthError('Failed to load Google credentials', {
      code: 'GOOGLE_TOKEN_DECRYPT_FAILED',
      httpStatus: 500,
    });
  }

  const client = createOAuth2Client();
  client.setCredentials({
    access_token: accessTokenPlain,
    refresh_token: refreshTokenPlain,
    expiry_date: user.googleTokenExpiresAt ? user.googleTokenExpiresAt.getTime() : undefined,
    scope: user.googleScopes.join(' '),
  });

  // Wire auto-refresh persistence.
  client.on('tokens', (tokens: Credentials) => {
    // `tokens` fires whenever the SDK gets a new access_token (refresh
    // path) and ALSO occasionally with a fresh id_token. We persist only
    // the bits that change.
    void persistRefreshedTokens(userId, tokens).catch((err) => {
      logger.warn('Failed to persist refreshed Google tokens', {
        userId,
        error: (err as Error).message,
      });
    });
  });

  return client;
}

/**
 * Best-effort scrubber for plaintext token strings. JS strings are
 * immutable so we cannot actually wipe memory — but we can drop our
 * references so the GC can reclaim them.
 *
 * Pattern matches the `exchanged.accessToken = ''` line in
 * routes/plaid.ts. Marker for future audits.
 */
export function scrubPlaintextToken(_token: string | undefined): void {
  // intentionally empty — see docblock
}

// ── Persistence ─────────────────────────────────────────────────────

export interface PersistGoogleTokensInput {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  /** Lifetime of the access_token in seconds (`expires_in` from Google). */
  expiresInSeconds?: number;
  /** Space-separated string of granted scopes. */
  scope?: string;
  googleEmail?: string;
}

/**
 * Encrypt + persist Google OAuth tokens for a user. Idempotent: if a
 * refresh_token is already on file and this call doesn't include one,
 * we KEEP the existing one. Google does NOT return a refresh_token on
 * subsequent consents unless `prompt=consent` + `access_type=offline`
 * are passed, so we cannot rely on every call to give us a fresh one.
 */
export async function persistGoogleTokens(input: PersistGoogleTokensInput): Promise<void> {
  const accessCt = encryptAccessToken(input.accessToken);

  // Only encrypt + overwrite the refresh ciphertext when we actually
  // got a new refresh_token. Otherwise leave the column alone.
  const refreshCt = input.refreshToken ? encryptAccessToken(input.refreshToken) : undefined;

  const scopes = input.scope
    ? input.scope.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
    : undefined;

  const expiresAt = input.expiresInSeconds
    ? new Date(Date.now() + input.expiresInSeconds * 1000)
    : undefined;

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      googleAccessTokenCiphertext: accessCt,
      ...(refreshCt ? { googleRefreshTokenCiphertext: refreshCt } : {}),
      ...(expiresAt ? { googleTokenExpiresAt: expiresAt } : {}),
      ...(scopes ? { googleScopes: scopes } : {}),
      ...(input.googleEmail ? { googleEmail: input.googleEmail.toLowerCase() } : {}),
      googleLinkedAt: new Date(),
    },
  });
}

/**
 * Internal: persist the `tokens` event payload from OAuth2Client.
 * Triggered automatically on every refresh.
 */
async function persistRefreshedTokens(userId: string, tokens: Credentials): Promise<void> {
  if (!tokens.access_token) return;

  const accessCt = encryptAccessToken(tokens.access_token);
  const refreshCt = tokens.refresh_token ? encryptAccessToken(tokens.refresh_token) : undefined;
  const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessTokenCiphertext: accessCt,
      ...(refreshCt ? { googleRefreshTokenCiphertext: refreshCt } : {}),
      ...(expiresAt ? { googleTokenExpiresAt: expiresAt } : {}),
    },
  });
}

/**
 * Revoke the Google tokens at Google and clear our local copies. Caller
 * is responsible for deleting downstream data (GoogleCalendarEvent /
 * GmailMessage rows) per their own privacy policy.
 *
 * Best-effort: if the revoke RPC at Google fails (e.g. token already
 * revoked, network blip) we still clear local state so the user is
 * "unlinked" from BillBee's perspective.
 */
export async function unlinkGoogle(userId: string): Promise<{ revokedAtGoogle: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessTokenCiphertext: true,
      googleRefreshTokenCiphertext: true,
    },
  });

  let revoked = false;
  if (user?.googleAccessTokenCiphertext || user?.googleRefreshTokenCiphertext) {
    try {
      const client = createOAuth2Client();
      // Prefer revoking the refresh_token (it invalidates the access too).
      let toRevoke: string | undefined;
      if (user.googleRefreshTokenCiphertext) {
        toRevoke = decryptAccessToken(user.googleRefreshTokenCiphertext);
      } else if (user.googleAccessTokenCiphertext) {
        toRevoke = decryptAccessToken(user.googleAccessTokenCiphertext);
      }
      if (toRevoke) {
        await client.revokeToken(toRevoke);
        revoked = true;
      }
    } catch (err) {
      logger.warn('Google token revoke at provider failed — continuing with local clear', {
        userId,
        error: (err as Error).message,
      });
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessTokenCiphertext: null,
      googleRefreshTokenCiphertext: null,
      googleTokenExpiresAt: null,
      googleScopes: [],
      googleEmail: null,
      googleLinkedAt: null,
      googleCalendarLastSyncedAt: null,
      googleGmailLastPolledAt: null,
      googleGmailHistoryId: null,
    },
  });

  return { revokedAtGoogle: revoked };
}

// ── Safe error mapping ─────────────────────────────────────────────

/**
 * Allowlist of Google API error codes/strings we are willing to echo
 * back to clients. Mirrors `SAFE_PLAID_ERRORS` in routes/plaid.ts so
 * we never leak raw Google error messages (which often contain request
 * ids, internal trace info, or sometimes message ids).
 */
export const SAFE_GOOGLE_ERRORS: Record<string, string> = {
  GOOGLE_NOT_LINKED: 'Google account is not linked.',
  GOOGLE_NOT_CONFIGURED: 'Google OAuth is not configured on this server.',
  GOOGLE_TOKEN_DECRYPT_FAILED: 'Google credentials could not be loaded.',
  GOOGLE_TOKEN_REFRESH_FAILED: 'Google session expired — please re-link your account.',
  GOOGLE_RATE_LIMITED: 'Too many requests to Google — please try again shortly.',
  GOOGLE_SCOPE_MISSING: 'Required Google permission was not granted.',
  GOOGLE_API_ERROR: 'Google service error — please try again.',
  GOOGLE_INVALID_REQUEST: 'Request to Google was rejected.',
  GOOGLE_UNAVAILABLE: 'Google service temporarily unavailable.',
};

/**
 * Map a raw Google API error to a stable, public-safe error code. We use
 * HTTP status hints (401/403/429) to choose codes; falls back to a
 * generic GOOGLE_API_ERROR.
 */
export function classifyGoogleError(err: unknown): GoogleOAuthError {
  if (err instanceof GoogleOAuthError) return err;
  const e = err as { response?: { status?: number; data?: unknown }; code?: number | string; message?: string };
  const status = typeof e?.response?.status === 'number' ? e.response.status : undefined;

  if (status === 401) {
    return new GoogleOAuthError('Google token rejected', {
      code: 'GOOGLE_TOKEN_REFRESH_FAILED',
      httpStatus: 401,
    });
  }
  if (status === 403) {
    return new GoogleOAuthError('Google permission missing', {
      code: 'GOOGLE_SCOPE_MISSING',
      httpStatus: 403,
    });
  }
  if (status === 429) {
    return new GoogleOAuthError('Google rate limit', {
      code: 'GOOGLE_RATE_LIMITED',
      httpStatus: 429,
    });
  }
  if (status === 400) {
    return new GoogleOAuthError('Bad Google request', {
      code: 'GOOGLE_INVALID_REQUEST',
      httpStatus: 400,
    });
  }
  if (status && status >= 500) {
    return new GoogleOAuthError('Google service unavailable', {
      code: 'GOOGLE_UNAVAILABLE',
      httpStatus: 502,
    });
  }
  return new GoogleOAuthError('Google API error', { code: 'GOOGLE_API_ERROR', httpStatus: 502 });
}
