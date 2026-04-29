import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { env } from '../config/env';

export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later' },
  },
});

export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
});

// ── Plaid-specific limiters ─────────────────────────────────────────

/**
 * Plaid webhook ingest: 600 requests / minute / IP. Generous to absorb
 * legitimate bursts from the Plaid signing service while still rejecting
 * pathological replay floods.
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'WEBHOOK_RATE_LIMIT_EXCEEDED',
      message: 'Too many webhook requests',
    },
  },
});

/**
 * Manual Plaid sync trigger: 1 request / minute / (user, item id).
 * Scoped by both `req.user.userId` AND the `:id` route param so:
 *   - Different items per user are independently rate-limited (UX).
 *   - An attacker who guesses a victim's plaidItemId cannot DoS the victim's
 *     own sync calls (QA1/F11). The user prefix isolates the buckets.
 */
export const plaidSyncLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId ?? 'anon';
    const itemId = (req.params?.id as string | undefined) ?? 'noid';
    return `plaid-sync:${userId}:${itemId}`;
  },
  // The default key validator complains because we deliberately do not
  // include the IP. That is correct for a per-(user,item) limiter — disable
  // the relevant validators.
  validate: false,
  message: {
    success: false,
    error: {
      code: 'PLAID_SYNC_RATE_LIMIT_EXCEEDED',
      message: 'Sync requested too frequently for this item — try again in a minute',
    },
  },
});
