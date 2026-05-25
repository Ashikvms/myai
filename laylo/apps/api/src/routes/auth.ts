import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import {
  Strategy as GoogleStrategy,
  type Profile as GoogleProfile,
  type GoogleCallbackParameters,
  type VerifyCallback as GoogleVerifyCallback,
} from 'passport-google-oauth20';
import { z } from 'zod';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import {
  register,
  login,
  rotateRefreshToken,
  loginWithGoogle,
  AuthError,
} from '../services/auth';
import { extractRequestMeta } from '../services/audit-log';
import { persistGoogleTokens } from '../services/google-oauth';
import { writeGoogleAccessLog } from '../services/google-audit';

const router = Router();

// ── Cookie helpers ─────────────────────

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const [key, ...rest] = pair.trim().split('=');
    if (key) {
      cookies[key.trim()] = decodeURIComponent(rest.join('=').trim());
    }
  }
  return cookies;
}

function setRefreshTokenCookie(res: Response, token: string): void {
  const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
  const secure = env.NODE_ENV === 'production';
  const parts = [
    `refreshToken=${encodeURIComponent(token)}`,
    `HttpOnly`,
    `Path=/api/auth`,
    `Max-Age=${maxAge}`,
    `SameSite=Strict`,
  ];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearRefreshTokenCookie(res: Response): void {
  const secure = env.NODE_ENV === 'production';
  const parts = [
    `refreshToken=`,
    `HttpOnly`,
    `Path=/api/auth`,
    `Max-Age=0`,
    `SameSite=Strict`,
  ];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

// ── Async route wrapper ────────────────

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// ── Routes ─────────────────────────────

// POST /register
router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken } = await register(
      req.body,
      extractRequestMeta(req),
    );
    setRefreshTokenCookie(res, refreshToken);
    res.status(201).json({ success: true, data: { user, accessToken } });
  }),
);

// POST /login
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken } = await login(
      req.body,
      extractRequestMeta(req),
    );
    setRefreshTokenCookie(res, refreshToken);
    res.json({ success: true, data: { user, accessToken } });
  }),
);

// POST /refresh
router.post(
  '/refresh',
  authLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const cookies = parseCookies(req.headers.cookie);
    const oldToken = cookies.refreshToken;

    if (!oldToken) {
      throw new AuthError('No refresh token provided', 'MISSING_REFRESH_TOKEN');
    }

    const { accessToken, refreshToken } = await rotateRefreshToken(oldToken);
    setRefreshTokenCookie(res, refreshToken);
    res.json({ success: true, data: { accessToken } });
  }),
);

// POST /logout
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.refreshToken;

    if (token) {
      // Find and revoke all tokens matching this one
      // Since we can't look up by raw token easily, we revoke via user lookup
      // Best effort — clear cookie regardless
      try {
        const bcrypt = await import('bcryptjs');
        const storedTokens = await prisma.refreshToken.findMany({
          where: { revoked: false, expiresAt: { gt: new Date() } },
        });
        for (const stored of storedTokens) {
          const isMatch = await bcrypt.compare(token, stored.tokenHash);
          if (isMatch) {
            await prisma.refreshToken.update({
              where: { id: stored.id },
              data: { revoked: true },
            });
            break;
          }
        }
      } catch (error) {
        logger.warn('Failed to revoke refresh token during logout', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    clearRefreshTokenCookie(res);
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  }),
);

// GET /me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        plan: true,
        onboardingComplete: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
    }

    res.json({ success: true, data: { user } });
  }),
);

// ── Google OAuth ───────────────────────

// Scopes the LOGIN flow requests. We always include Calendar + Gmail so a
// user who signs in with Google can immediately use those integrations
// without a separate consent screen. The Gmail scope is intentionally
// readonly here; the LINK flow (routes/google.ts) lets a user upgrade to
// gmail.modify (needed to mark messages as read) if they opt in.
const LOGIN_OAUTH_SCOPES: string[] = ['profile', 'email'];
function buildLoginScopes(): string[] {
  const calendar = env.GOOGLE_CALENDAR_SCOPES
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // For LOGIN we only ask for the readonly Gmail scope — the more invasive
  // `gmail.modify` is gated behind the explicit LINK flow opt-in.
  const gmail = env.GOOGLE_GMAIL_SCOPES
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => /gmail\.readonly$/.test(s));
  return Array.from(new Set([...LOGIN_OAUTH_SCOPES, ...calendar, ...gmail]));
}

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  const loginScopes = buildLoginScopes();

  passport.use(
    'google-login',
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        scope: loginScopes,
        // `passReqToCallback` keeps the door open for surfacing CSRF-state
        // or pre-link session context to the callback later.
      },
      (
        accessToken: string,
        refreshToken: string,
        params: GoogleCallbackParameters,
        profile: GoogleProfile,
        done: GoogleVerifyCallback,
      ) => {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          done(new Error('No email found in Google profile'));
          return;
        }
        // `userId` is filled in downstream by `loginWithGoogle`; the
        // value we hand to `done` is consumed only by the callback.
        const user = {
          userId: '',
          googleId: profile.id,
          email,
          name: profile.displayName || email,
          avatarUrl: profile.photos?.[0]?.value,
          // Carry the OAuth tokens through to the callback so they can be
          // encrypted + persisted server-side. Never returned to the
          // client.
          _oauth: {
            accessToken,
            refreshToken,
            expiresIn: params?.expires_in,
            scope: params?.scope,
          },
        } as unknown as Express.User;
        done(null, user);
      },
    ),
  );

  // GET /google
  router.get(
    '/google',
    passport.authenticate('google-login', {
      session: false,
      scope: loginScopes,
      // accessType=offline + prompt=consent is what makes Google issue a
      // refresh_token EVERY time (otherwise it is only returned on the
      // very first consent). Required because we lose the refresh token
      // permanently if the user re-consents without these.
      accessType: 'offline',
      prompt: 'consent',
      // include_granted_scopes lets Google grant only NEW scopes on
      // subsequent consents — keeps the flow incremental.
      includeGrantedScopes: true,
    } as Parameters<typeof passport.authenticate>[1]),
  );

  // GET /google/callback
  router.get(
    '/google/callback',
    passport.authenticate('google-login', {
      session: false,
      failureRedirect: `${env.APP_URL}/login?error=google_auth_failed`,
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const profile = req.user as unknown as {
        googleId: string;
        email: string;
        name: string;
        avatarUrl?: string;
        _oauth?: {
          accessToken?: string;
          refreshToken?: string;
          expiresIn?: number;
          scope?: string;
        };
      };

      const meta = extractRequestMeta(req);
      const { user, accessToken, refreshToken } = await loginWithGoogle({
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      });
      setRefreshTokenCookie(res, refreshToken);

      // Best-effort: persist Google OAuth tokens for Calendar/Gmail. We
      // never fail the login on persist errors — the user can re-link
      // from settings if this step bombs.
      const oauth = profile._oauth;
      if (oauth?.accessToken) {
        try {
          await persistGoogleTokens({
            userId: user.id,
            accessToken: oauth.accessToken,
            refreshToken: oauth.refreshToken,
            expiresInSeconds: oauth.expiresIn,
            scope: oauth.scope,
            googleEmail: profile.email,
          });
          await writeGoogleAccessLog({
            userId: user.id,
            action: 'LINK',
            scope: 'oauth',
            endpoint: 'auth/google/callback',
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
            context: { source: 'login_flow', hasRefreshToken: !!oauth.refreshToken },
          });
        } catch (err) {
          logger.warn('Failed to persist Google OAuth tokens during login', {
            userId: user.id,
            error: (err as Error).message,
          });
        } finally {
          // Best-effort scrub of in-memory plaintext
          if (oauth) {
            oauth.accessToken = '';
            oauth.refreshToken = '';
          }
        }
      }

      // Redirect to the app with the access token in the URL **fragment**
      // (after `#`) rather than a query string. Fragments are NEVER sent
      // to servers, NEVER appear in access logs, and are NEVER attached
      // to the Referer header — preventing token leak via reverse
      // proxies, CDN logs, browser history sync, or third-party analytics
      // loaded by the callback page.
      //
      // The frontend reads it via `window.location.hash` and immediately
      // calls `history.replaceState` to scrub it.
      const redirectUrl = new URL('/auth/callback', env.APP_URL);
      redirectUrl.hash = `accessToken=${encodeURIComponent(accessToken)}`;
      res.redirect(redirectUrl.toString());
    }),
  );

  logger.info('Google OAuth configured', { scopes: loginScopes });
} else {
  router.get('/google', (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      error: { code: 'GOOGLE_NOT_CONFIGURED', message: 'Google OAuth is not configured' },
    });
  });
}

export default router;
