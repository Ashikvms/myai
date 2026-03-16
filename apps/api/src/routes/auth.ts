import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
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
    const { user, accessToken, refreshToken } = await register(req.body);
    setRefreshTokenCookie(res, refreshToken);
    res.status(201).json({ success: true, data: { user, accessToken } });
  }),
);

// POST /login
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken } = await login(req.body);
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

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      (_accessToken, _refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'));
        }
        done(null, {
          googleId: profile.id,
          email,
          name: profile.displayName || email,
          avatarUrl: profile.photos?.[0]?.value,
        } as Express.User);
      },
    ),
  );

  // GET /google
  router.get('/google', passport.authenticate('google', { session: false, scope: ['profile', 'email'] }));

  // GET /google/callback
  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${env.APP_URL}/login?error=google_auth_failed` }),
    asyncHandler(async (req: Request, res: Response) => {
      const profile = req.user as unknown as {
        googleId: string;
        email: string;
        name: string;
        avatarUrl?: string;
      };

      const { accessToken, refreshToken } = await loginWithGoogle(profile);
      setRefreshTokenCookie(res, refreshToken);

      // Redirect to the app with the access token
      const redirectUrl = new URL('/auth/callback', env.APP_URL);
      redirectUrl.searchParams.set('accessToken', accessToken);
      res.redirect(redirectUrl.toString());
    }),
  );

  logger.info('Google OAuth configured');
} else {
  router.get('/google', (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      error: { code: 'GOOGLE_NOT_CONFIGURED', message: 'Google OAuth is not configured' },
    });
  });
}

export default router;
