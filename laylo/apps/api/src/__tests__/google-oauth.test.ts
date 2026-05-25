/**
 * Tests for `services/google-oauth.ts` — token persistence, retrieval,
 * scope helpers, and error classification.
 *
 * The OAuth2Client is mocked so we never touch the network. Prisma is a
 * tiny in-memory store keyed by user id; this lets us exercise the
 * encrypt → store → retrieve → decrypt path end-to-end through the real
 * crypto service (no mock there — we want a true round-trip).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Two distinct keys so we can verify cross-key tampering rejection.
const ENC_KEY = 'a'.repeat(64);

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    ENCRYPTION_KEY: ENC_KEY,
    ENCRYPTION_KEY_VERSION: 1,
    GOOGLE_CLIENT_ID: 'cid',
    GOOGLE_CLIENT_SECRET: 'csecret',
    GOOGLE_CALENDAR_SCOPES: 'https://www.googleapis.com/auth/calendar',
    GOOGLE_GMAIL_SCOPES:
      'https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.modify',
    GOOGLE_LINK_REDIRECT_URI: 'http://localhost:3001/api/google/link/callback',
  },
}));

vi.mock('../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── In-memory prisma mock ───────────────────────────────────────────

interface UserRow {
  id: string;
  googleAccessTokenCiphertext: string | null;
  googleRefreshTokenCiphertext: string | null;
  googleTokenExpiresAt: Date | null;
  googleScopes: string[];
  googleEmail: string | null;
  googleLinkedAt: Date | null;
  googleCalendarLastSyncedAt: Date | null;
  googleGmailLastPolledAt: Date | null;
  googleGmailHistoryId: string | null;
}

const users: Record<string, UserRow> = {};

function blankUser(id: string): UserRow {
  return {
    id,
    googleAccessTokenCiphertext: null,
    googleRefreshTokenCiphertext: null,
    googleTokenExpiresAt: null,
    googleScopes: [],
    googleEmail: null,
    googleLinkedAt: null,
    googleCalendarLastSyncedAt: null,
    googleGmailLastPolledAt: null,
    googleGmailHistoryId: null,
  };
}

const mockPrisma = {
  user: {
    findUnique: vi.fn(async ({ where, select: _ }: { where: { id: string }; select?: unknown }) => {
      void _;
      return users[where.id] ?? null;
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<UserRow> }) => {
      const u = users[where.id];
      if (!u) throw new Error('not found');
      Object.assign(u, data);
      return u;
    }),
  },
};

vi.mock('../config/prisma', () => ({ prisma: mockPrisma }));

// ── Mock google-auth-library OAuth2Client ──────────────────────────

const tokenListeners: Array<(t: unknown) => void> = [];
const revokeToken = vi.fn().mockResolvedValue(undefined);
const setCredentials = vi.fn();

vi.mock('google-auth-library', () => {
  return {
    OAuth2Client: class {
      setCredentials = setCredentials;
      revokeToken = revokeToken;
      on = (event: string, cb: (t: unknown) => void) => {
        if (event === 'tokens') tokenListeners.push(cb);
        return this;
      };
    },
  };
});

describe('google-oauth', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    tokenListeners.length = 0;
    for (const k of Object.keys(users)) delete users[k];
    const cryptoMod = await import('../services/crypto');
    cryptoMod._resetCryptoKeyCache();
  });

  describe('persistGoogleTokens', () => {
    it('encrypts tokens and persists user fields (round-trip)', async () => {
      users['u-1'] = blankUser('u-1');
      const { persistGoogleTokens } = await import('../services/google-oauth');
      const { decryptAccessToken } = await import('../services/crypto');

      await persistGoogleTokens({
        userId: 'u-1',
        accessToken: 'gat-12345',
        refreshToken: 'grt-67890',
        expiresInSeconds: 3600,
        scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly',
        googleEmail: 'User@Example.com',
      });

      const row = users['u-1']!;
      // Stored ciphertext should NOT include the plaintext anywhere.
      expect(row.googleAccessTokenCiphertext).not.toContain('gat-12345');
      expect(row.googleRefreshTokenCiphertext).not.toContain('grt-67890');
      expect(row.googleAccessTokenCiphertext?.startsWith('v')).toBe(true);

      // Round-trip
      expect(decryptAccessToken(row.googleAccessTokenCiphertext!)).toBe('gat-12345');
      expect(decryptAccessToken(row.googleRefreshTokenCiphertext!)).toBe('grt-67890');

      expect(row.googleScopes).toEqual([
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/gmail.readonly',
      ]);
      expect(row.googleEmail).toBe('user@example.com');
      expect(row.googleLinkedAt).toBeInstanceOf(Date);
      expect(row.googleTokenExpiresAt).toBeInstanceOf(Date);
    });

    it('preserves existing refresh ciphertext when no new refresh token is provided', async () => {
      users['u-2'] = {
        ...blankUser('u-2'),
        googleRefreshTokenCiphertext: 'v1:PREEXISTING',
      };
      const { persistGoogleTokens } = await import('../services/google-oauth');

      await persistGoogleTokens({
        userId: 'u-2',
        accessToken: 'newacc',
        expiresInSeconds: 60,
      });

      expect(users['u-2']!.googleRefreshTokenCiphertext).toBe('v1:PREEXISTING');
    });
  });

  describe('getGoogleClient', () => {
    it('throws GOOGLE_NOT_LINKED for an unlinked user', async () => {
      users['u-3'] = blankUser('u-3');
      const { getGoogleClient, GoogleOAuthError } = await import('../services/google-oauth');
      await expect(getGoogleClient('u-3')).rejects.toBeInstanceOf(GoogleOAuthError);
      try {
        await getGoogleClient('u-3');
      } catch (err) {
        expect((err as { code: string }).code).toBe('GOOGLE_NOT_LINKED');
      }
    });

    it('decrypts and sets credentials on the OAuth2 client', async () => {
      users['u-4'] = blankUser('u-4');
      const { persistGoogleTokens, getGoogleClient } = await import('../services/google-oauth');
      await persistGoogleTokens({
        userId: 'u-4',
        accessToken: 'access-tok',
        refreshToken: 'refresh-tok',
        expiresInSeconds: 1800,
        scope: 'https://www.googleapis.com/auth/calendar',
      });
      await getGoogleClient('u-4');

      expect(setCredentials).toHaveBeenCalledOnce();
      const creds = setCredentials.mock.calls[0]![0] as { access_token: string; refresh_token: string };
      expect(creds.access_token).toBe('access-tok');
      expect(creds.refresh_token).toBe('refresh-tok');
    });

    it('persists refreshed tokens when the OAuth2Client emits "tokens"', async () => {
      users['u-5'] = blankUser('u-5');
      const { persistGoogleTokens, getGoogleClient } = await import('../services/google-oauth');
      const { decryptAccessToken } = await import('../services/crypto');

      await persistGoogleTokens({
        userId: 'u-5',
        accessToken: 'oldaccess',
        refreshToken: 'rt-1',
        expiresInSeconds: 60,
      });
      await getGoogleClient('u-5');

      expect(tokenListeners).toHaveLength(1);
      const listener = tokenListeners[0]!;
      listener({
        access_token: 'NEW-ACCESS-TOK',
        expiry_date: Date.now() + 3600 * 1000,
      });
      // Listener returns a Promise — wait for it.
      await new Promise((r) => setTimeout(r, 5));

      expect(decryptAccessToken(users['u-5']!.googleAccessTokenCiphertext!)).toBe('NEW-ACCESS-TOK');
      // Refresh token must be left alone if not present in the event.
      expect(decryptAccessToken(users['u-5']!.googleRefreshTokenCiphertext!)).toBe('rt-1');
    });
  });

  describe('scope helpers', () => {
    it('hasCalendarScope detects the calendar scope', async () => {
      const { hasCalendarScope } = await import('../services/google-oauth');
      expect(hasCalendarScope(['https://www.googleapis.com/auth/calendar'])).toBe(true);
      expect(hasCalendarScope(['https://www.googleapis.com/auth/gmail.readonly'])).toBe(false);
    });

    it('hasGmailScope detects either gmail scope', async () => {
      const { hasGmailScope } = await import('../services/google-oauth');
      expect(hasGmailScope(['https://www.googleapis.com/auth/gmail.readonly'])).toBe(true);
      expect(hasGmailScope(['https://www.googleapis.com/auth/gmail.modify'])).toBe(true);
      expect(hasGmailScope(['profile'])).toBe(false);
    });
  });

  describe('classifyGoogleError', () => {
    it('maps 401 → GOOGLE_TOKEN_REFRESH_FAILED', async () => {
      const { classifyGoogleError } = await import('../services/google-oauth');
      const err = classifyGoogleError({ response: { status: 401 } });
      expect(err.code).toBe('GOOGLE_TOKEN_REFRESH_FAILED');
    });

    it('maps 429 → GOOGLE_RATE_LIMITED', async () => {
      const { classifyGoogleError } = await import('../services/google-oauth');
      const err = classifyGoogleError({ response: { status: 429 } });
      expect(err.code).toBe('GOOGLE_RATE_LIMITED');
    });

    it('maps 5xx → GOOGLE_UNAVAILABLE', async () => {
      const { classifyGoogleError } = await import('../services/google-oauth');
      const err = classifyGoogleError({ response: { status: 503 } });
      expect(err.code).toBe('GOOGLE_UNAVAILABLE');
    });

    it('falls back to GOOGLE_API_ERROR for unknown shapes', async () => {
      const { classifyGoogleError } = await import('../services/google-oauth');
      const err = classifyGoogleError(new Error('mystery'));
      expect(err.code).toBe('GOOGLE_API_ERROR');
    });
  });

  describe('unlinkGoogle', () => {
    it('clears local fields even if Google revoke fails', async () => {
      users['u-6'] = blankUser('u-6');
      const { persistGoogleTokens, unlinkGoogle } = await import('../services/google-oauth');

      await persistGoogleTokens({
        userId: 'u-6',
        accessToken: 'a',
        refreshToken: 'r',
        scope: 'https://www.googleapis.com/auth/calendar',
        expiresInSeconds: 60,
      });
      revokeToken.mockRejectedValueOnce(new Error('network blip'));

      const result = await unlinkGoogle('u-6');
      expect(result.revokedAtGoogle).toBe(false);
      expect(users['u-6']!.googleAccessTokenCiphertext).toBeNull();
      expect(users['u-6']!.googleRefreshTokenCiphertext).toBeNull();
      expect(users['u-6']!.googleScopes).toEqual([]);
      expect(users['u-6']!.googleLinkedAt).toBeNull();
    });
  });
});
