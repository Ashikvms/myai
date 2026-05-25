/**
 * Google integration HTTP surface.
 *
 * Auth model:
 *   - All endpoints require a logged-in session via `requireAuth`.
 *   - `/link` and `/link/callback` drive the OAuth dance for users who
 *     already have a BillBee session (e.g. password sign-up). This NEVER
 *     replaces their session — we only add Google tokens to their
 *     existing user record.
 *
 * Error handling:
 *   - All Google API errors are funnelled through `SAFE_GOOGLE_ERRORS`
 *     before being returned to clients (no raw error.message leak).
 *
 * Audit:
 *   - Every endpoint writes a row to `GoogleDataAccessLog` so a privacy
 *     review can answer "what did BillBee do with this user's Google
 *     data?" without trawling logs.
 */

import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Credentials } from 'google-auth-library';
import { z } from 'zod';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { googleLinkLimiter, googleSyncLimiter } from '../middleware/rateLimiter';
import {
  createOAuth2Client,
  getLinkFlowScopes,
  persistGoogleTokens,
  unlinkGoogle,
  GoogleOAuthError,
  SAFE_GOOGLE_ERRORS,
  classifyGoogleError,
} from '../services/google-oauth';
import { writeGoogleAccessLog, extractGoogleRequestMeta } from '../services/google-audit';
import { enqueueGoogleJob, JobType } from '../jobs/queue';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function safeGoogleErrorResponse(res: Response, err: GoogleOAuthError): void {
  const message = SAFE_GOOGLE_ERRORS[err.code] ?? 'Google service error. Please try again.';
  const status = err.httpStatus ?? 502;
  res.status(status).json({ success: false, error: { code: err.code, message } });
}

// ── OAuth state token (CSRF guard for /link) ────────────────────────
//
// We can't keep server-side sessions (the API is stateless) and we don't
// want to write a row to the DB for every link attempt. Instead we sign
// the userId + a nonce + a timestamp with HMAC-SHA256 keyed by
// ENCRYPTION_KEY (already required and 32 bytes of secret material).
// On callback we verify the signature + recency window (10 minutes).
//
// This binds the OAuth callback to the user who started it, preventing
// a logged-in attacker from completing a stolen state token.

const LINK_STATE_TTL_MS = 10 * 60 * 1000;
const LINK_STATE_NONCE_BYTES = 16;

function getStateHmacKey(): Buffer {
  if (!env.ENCRYPTION_KEY || !/^[0-9a-f]{64}$/.test(env.ENCRYPTION_KEY)) {
    throw new Error('ENCRYPTION_KEY missing or malformed — required for OAuth state signing');
  }
  return Buffer.from(env.ENCRYPTION_KEY, 'hex');
}

function signLinkState(userId: string): string {
  const nonce = randomBytes(LINK_STATE_NONCE_BYTES).toString('hex');
  const issuedAt = Date.now();
  const payload = `${userId}|${nonce}|${issuedAt}`;
  const mac = createHmac('sha256', getStateHmacKey()).update(payload).digest('hex');
  return `${Buffer.from(payload, 'utf8').toString('base64url')}.${mac}`;
}

function verifyLinkState(state: string, expectedUserId: string): boolean {
  if (typeof state !== 'string' || !state.includes('.')) return false;
  const [payloadB64, macHex] = state.split('.', 2);
  if (!payloadB64 || !macHex) return false;
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
  } catch {
    return false;
  }
  const parts = payload.split('|');
  if (parts.length !== 3) return false;
  const [userId, , issuedAtStr] = parts;
  if (userId !== expectedUserId) return false;
  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > LINK_STATE_TTL_MS) return false;

  const expectedMac = createHmac('sha256', getStateHmacKey()).update(payload).digest('hex');
  // Length-equal timingSafeEqual.
  if (expectedMac.length !== macHex.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expectedMac, 'hex'), Buffer.from(macHex, 'hex'));
  } catch {
    return false;
  }
}

// ── Validation schemas ──────────────────────────────────────────────

const linkBodySchema = z
  .object({
    successRedirect: z.string().url().optional(),
  })
  .optional()
  .default({});

const listEventsSchema = z.object({
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const listMessagesSchema = z.object({
  processed: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  category: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// ── Auth + routes ──────────────────────────────────────────────────

router.use(requireAuth);

// GET /api/google/status
router.get(
  '/status',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleEmail: true,
        googleScopes: true,
        googleLinkedAt: true,
        googleCalendarLastSyncedAt: true,
        googleGmailLastPolledAt: true,
        googleAccessTokenCiphertext: true,
      },
    });

    res.json({
      success: true,
      data: {
        linked: !!user?.googleAccessTokenCiphertext,
        googleEmail: user?.googleEmail ?? null,
        scopes: user?.googleScopes ?? [],
        linkedAt: user?.googleLinkedAt ?? null,
        calendarLastSyncedAt: user?.googleCalendarLastSyncedAt ?? null,
        gmailLastPolledAt: user?.googleGmailLastPolledAt ?? null,
      },
    });
  }),
);

// POST /api/google/link — kick off the OAuth dance for an authed user.
router.post(
  '/link',
  googleLinkLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      res.status(501).json({
        success: false,
        error: { code: 'GOOGLE_NOT_CONFIGURED', message: SAFE_GOOGLE_ERRORS.GOOGLE_NOT_CONFIGURED },
      });
      return;
    }
    const userId = req.user!.userId;
    const meta = extractGoogleRequestMeta(req);
    const parsed = linkBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors },
      });
      return;
    }

    const oauth = createOAuth2Client(env.GOOGLE_LINK_REDIRECT_URI);
    const state = signLinkState(userId);
    const url = oauth.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      scope: getLinkFlowScopes(),
      state,
    });

    await writeGoogleAccessLog({
      userId,
      action: 'LINK',
      scope: 'oauth',
      endpoint: 'google.link.start',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      context: { hasSuccessRedirect: !!parsed.data.successRedirect },
    });

    res.json({ success: true, data: { url } });
  }),
);

// GET /api/google/link/callback — Google redirects here after consent.
// We accept the `code` + verify `state`, exchange for tokens, persist,
// and bounce the browser back to the SPA's settings page.
//
// IMPORTANT: this route must be auth'd — the browser will have the
// existing BillBee access_token in its cookie + Authorization header.
// If a user clicks a stolen state token while logged out, requireAuth
// rejects them before we ever touch Google.
router.get(
  '/link/callback',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const meta = extractGoogleRequestMeta(req);
    const code = req.query.code;
    const state = req.query.state;
    const error = req.query.error;
    const redirectBase = env.GOOGLE_LINK_SUCCESS_REDIRECT ?? `${env.APP_URL}/settings`;

    if (error) {
      logger.warn('Google link callback: provider returned error', { userId, error });
      const url = new URL(redirectBase);
      url.searchParams.set('googleLink', 'error');
      url.searchParams.set('reason', String(error).slice(0, 40));
      res.redirect(url.toString());
      return;
    }

    if (typeof code !== 'string' || typeof state !== 'string' || !code || !state) {
      const url = new URL(redirectBase);
      url.searchParams.set('googleLink', 'error');
      url.searchParams.set('reason', 'missing_params');
      res.redirect(url.toString());
      return;
    }

    if (!verifyLinkState(state, userId)) {
      await writeGoogleAccessLog({
        userId,
        action: 'LINK',
        scope: 'oauth',
        endpoint: 'google.link.callback',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        context: { failed: true, reason: 'invalid_state' },
      });
      const url = new URL(redirectBase);
      url.searchParams.set('googleLink', 'error');
      url.searchParams.set('reason', 'invalid_state');
      res.redirect(url.toString());
      return;
    }

    let tokens: Credentials;
    let oauthEmail: string | undefined;
    try {
      const oauth = createOAuth2Client(env.GOOGLE_LINK_REDIRECT_URI);
      const exchange = await oauth.getToken(code);
      tokens = exchange.tokens;

      // Pull the Google account email from the id_token if present so we
      // can persist `googleEmail`. We do NOT trust this for auth — just
      // for display in the settings UI.
      if (tokens.id_token) {
        try {
          const ticket = await oauth.verifyIdToken({
            idToken: tokens.id_token,
            audience: env.GOOGLE_CLIENT_ID,
          });
          const payload = ticket.getPayload();
          if (payload?.email) oauthEmail = payload.email;
        } catch {
          // best-effort — proceed without the email
        }
      }
    } catch (err) {
      logger.warn('Google link callback: getToken failed', {
        userId,
        error: (err as Error).message,
      });
      const url = new URL(redirectBase);
      url.searchParams.set('googleLink', 'error');
      url.searchParams.set('reason', 'token_exchange_failed');
      res.redirect(url.toString());
      return;
    }

    try {
      if (!tokens.access_token) {
        throw new Error('Google returned no access_token');
      }
      await persistGoogleTokens({
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresInSeconds:
          tokens.expiry_date != null
            ? Math.max(0, Math.floor((tokens.expiry_date - Date.now()) / 1000))
            : undefined,
        scope: typeof tokens.scope === 'string' ? tokens.scope : undefined,
        googleEmail: oauthEmail,
      });

      await writeGoogleAccessLog({
        userId,
        action: 'LINK',
        scope: 'oauth',
        endpoint: 'google.link.callback',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        context: {
          hasRefreshToken: !!tokens.refresh_token,
          grantedScopes: typeof tokens.scope === 'string' ? tokens.scope.split(' ') : [],
        },
      });

      // Best-effort scrub
      tokens.access_token = '';
      if (tokens.refresh_token) tokens.refresh_token = '';

      // Schedule an immediate calendar sync + Gmail poll so the UI has
      // data to show right away.
      try {
        await enqueueGoogleJob(JobType.GOOGLE_CALENDAR_SYNC_USER, { userId });
        await enqueueGoogleJob(JobType.GMAIL_POLLING_SYNC_USER, { userId });
      } catch (err) {
        logger.warn('Google link: failed to enqueue initial sync — continuing', {
          userId,
          error: (err as Error).message,
        });
      }

      const url = new URL(redirectBase);
      url.searchParams.set('googleLink', 'success');
      res.redirect(url.toString());
    } catch (err) {
      logger.error('Google link callback: persistGoogleTokens failed', {
        userId,
        error: (err as Error).message,
      });
      const url = new URL(redirectBase);
      url.searchParams.set('googleLink', 'error');
      url.searchParams.set('reason', 'persist_failed');
      res.redirect(url.toString());
    }
  }),
);

// POST /api/google/unlink
router.post(
  '/unlink',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const meta = extractGoogleRequestMeta(req);

    let revokedAtGoogle = false;
    try {
      const result = await unlinkGoogle(userId);
      revokedAtGoogle = result.revokedAtGoogle;
    } catch (err) {
      logger.warn('unlinkGoogle threw — local state still cleared', {
        userId,
        error: (err as Error).message,
      });
    }

    // Soft-delete Gmail messages + hard-delete GoogleCalendarEvent links.
    // The downstream Bills/Appointments (FK to source data) stay intact —
    // they were materialised user data and the user may still want them.
    const [gmailUpdated, gcalDeleted] = await prisma.$transaction([
      prisma.gmailMessage.updateMany({
        where: { userId, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
      prisma.googleCalendarEvent.deleteMany({ where: { userId } }),
    ]);

    await writeGoogleAccessLog({
      userId,
      action: 'UNLINK',
      scope: 'oauth',
      endpoint: 'google.unlink',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      context: {
        revokedAtGoogle,
        gmailMessagesSoftDeleted: gmailUpdated.count,
        googleCalendarEventsDeleted: gcalDeleted.count,
      },
    });

    res.json({
      success: true,
      data: {
        revokedAtGoogle,
        gmailMessagesSoftDeleted: gmailUpdated.count,
        googleCalendarEventsDeleted: gcalDeleted.count,
      },
    });
  }),
);

// POST /api/google/calendar/sync
router.post(
  '/calendar/sync',
  googleSyncLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const meta = extractGoogleRequestMeta(req);
    try {
      const job = await enqueueGoogleJob(JobType.GOOGLE_CALENDAR_SYNC_USER, { userId });
      await writeGoogleAccessLog({
        userId,
        action: 'SYNC',
        scope: 'calendar',
        endpoint: 'google.calendar.sync',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        context: { jobId: job?.id ?? null },
      });
      res.status(202).json({ success: true, data: { jobId: job?.id ?? null, queued: !!job } });
    } catch (err) {
      if (err instanceof GoogleOAuthError) {
        safeGoogleErrorResponse(res, err);
        return;
      }
      throw err;
    }
  }),
);

// POST /api/google/gmail/poll
router.post(
  '/gmail/poll',
  googleSyncLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const meta = extractGoogleRequestMeta(req);
    try {
      const job = await enqueueGoogleJob(JobType.GMAIL_POLLING_SYNC_USER, { userId });
      await writeGoogleAccessLog({
        userId,
        action: 'SYNC',
        scope: 'gmail',
        endpoint: 'google.gmail.poll',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        context: { jobId: job?.id ?? null },
      });
      res.status(202).json({ success: true, data: { jobId: job?.id ?? null, queued: !!job } });
    } catch (err) {
      if (err instanceof GoogleOAuthError) {
        safeGoogleErrorResponse(res, err);
        return;
      }
      throw err;
    }
  }),
);

// GET /api/google/calendar/events
router.get(
  '/calendar/events',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const meta = extractGoogleRequestMeta(req);
    const parsed = listEventsSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors },
      });
      return;
    }
    const since = parsed.data.since ? new Date(parsed.data.since) : undefined;

    const events = await prisma.googleCalendarEvent.findMany({
      where: {
        userId,
        ...(since ? { startAt: { gte: since } } : {}),
      },
      orderBy: { startAt: 'asc' },
      take: parsed.data.limit,
    });

    await writeGoogleAccessLog({
      userId,
      action: 'READ',
      scope: 'calendar',
      endpoint: 'google.calendar.events.list',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      context: { count: events.length, since: since?.toISOString() ?? null },
    });

    res.json({ success: true, data: events });
  }),
);

// GET /api/google/gmail/messages
router.get(
  '/gmail/messages',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const meta = extractGoogleRequestMeta(req);
    const parsed = listMessagesSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors },
      });
      return;
    }
    const messages = await prisma.gmailMessage.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(parsed.data.processed === true ? { processedAt: { not: null } } : {}),
        ...(parsed.data.processed === false ? { processedAt: null } : {}),
        ...(parsed.data.category ? { category: parsed.data.category } : {}),
      },
      orderBy: { receivedAt: 'desc' },
      take: parsed.data.limit,
    });

    await writeGoogleAccessLog({
      userId,
      action: 'READ',
      scope: 'gmail',
      endpoint: 'google.gmail.messages.list',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      context: { count: messages.length, ...parsed.data },
    });

    res.json({ success: true, data: messages });
  }),
);

// Catch-all error handler so we never leak raw Google errors.
router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return;
  if (err instanceof GoogleOAuthError) {
    safeGoogleErrorResponse(res, err);
    return;
  }
  // Try to classify as a Google API error.
  const classified = classifyGoogleError(err);
  safeGoogleErrorResponse(res, classified);
});

export default router;
