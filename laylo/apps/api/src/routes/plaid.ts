import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import type { PlaidItemStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { requireAuth } from '../middleware/auth';
import { plaidSyncLimiter, webhookLimiter } from '../middleware/rateLimiter';
import {
  createLinkToken,
  exchangePublicToken,
  removeItem,
  verifyWebhook,
  PlaidError,
} from '../services/plaid';
import { encryptAccessToken } from '../services/crypto';
import { extractRequestMeta, writeAccessLog } from '../services/audit-log';
import { enqueuePlaidJob, JobType } from '../jobs/queue';

// ── Plaid error sanitisation (F10) ──────────────────────────────────
//
// We never echo Plaid's raw `err.message` to clients — it can contain PII,
// internal request IDs, or trace information. Instead we map known codes
// to short, user-friendly strings; everything else gets a generic fallback.
const SAFE_PLAID_ERRORS: Record<string, string> = {
  ITEM_LOGIN_REQUIRED: 'Bank connection requires re-authentication.',
  INVALID_PUBLIC_TOKEN: 'Bank link request expired. Please try again.',
  INVALID_ACCESS_TOKEN: 'Bank connection is no longer valid. Please reconnect.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again shortly.',
  INTERNAL_SERVER_ERROR: 'Bank service temporarily unavailable.',
  INSTITUTION_DOWN: 'Bank service temporarily unavailable.',
  PLANNED_MAINTENANCE: 'Bank service is undergoing maintenance.',
  ITEM_LOCKED: 'Bank connection locked. Please contact your bank.',
};

function safePlaidErrorResponse(res: Response, err: PlaidError): void {
  const safeMessage = SAFE_PLAID_ERRORS[err.code] ?? 'Bank service error. Please try again.';
  res.status(502).json({ success: false, error: { code: err.code, message: safeMessage } });
}

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// ── Helpers ───────────────────────────────────────────────────────

function mapPlaidAccountType(t: string): 'DEPOSITORY' | 'CREDIT' | 'LOAN' | 'INVESTMENT' | 'OTHER' {
  const normalized = (t ?? '').toLowerCase();
  switch (normalized) {
    case 'depository':
      return 'DEPOSITORY';
    case 'credit':
      return 'CREDIT';
    case 'loan':
      return 'LOAN';
    case 'investment':
      return 'INVESTMENT';
    default:
      return 'OTHER';
  }
}

function mapPlaidSubtype(s: string | null | undefined):
  | 'CHECKING' | 'SAVINGS' | 'HSA' | 'CD' | 'MONEY_MARKET' | 'PAYPAL' | 'PREPAID'
  | 'CREDIT_CARD' | 'AUTO' | 'MORTGAGE' | 'STUDENT' | 'PERSONAL' | 'OTHER'
  | null {
  if (!s) return null;
  const map: Record<string, ReturnType<typeof mapPlaidSubtype>> = {
    checking: 'CHECKING',
    savings: 'SAVINGS',
    hsa: 'HSA',
    cd: 'CD',
    'money market': 'MONEY_MARKET',
    paypal: 'PAYPAL',
    prepaid: 'PREPAID',
    'credit card': 'CREDIT_CARD',
    auto: 'AUTO',
    mortgage: 'MORTGAGE',
    student: 'STUDENT',
    personal: 'PERSONAL',
    other: 'OTHER',
  };
  return map[s.toLowerCase()] ?? 'OTHER';
}

function stripCiphertext<T extends { accessTokenCiphertext?: unknown }>(item: T): Omit<T, 'accessTokenCiphertext'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { accessTokenCiphertext, ...rest } = item;
  return rest;
}

// ── Validation schemas ────────────────────────────────────────────

const createLinkTokenSchema = z.object({
  products: z.array(z.enum(['transactions', 'auth'])).optional(),
  redirectUri: z.string().url().optional(),
});

const exchangeSchema = z.object({
  publicToken: z.string().min(1),
  institutionId: z.string().min(1),
  institutionName: z.string().min(1).max(200),
  // F11: cap account list to prevent oversized payloads.
  accounts: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(200),
        mask: z.string().nullable(),
        type: z.string().min(1),
        subtype: z.string().nullable(),
      }),
    )
    .min(1)
    .max(50),
});

// F3: webhook payload validation. `passthrough()` lets unknown future Plaid
// fields through without rejecting them — we only assert on the fields we
// actually use.
const webhookPayloadSchema = z
  .object({
    webhook_type: z.string().min(1).max(60),
    webhook_code: z.string().min(1).max(60),
    item_id: z.string().min(1).max(80).optional(),
    request_id: z.string().min(1).max(80).optional(),
  })
  .passthrough();

// ── Routes ────────────────────────────────────────────────────────

// ── Webhook (NO auth, raw body) ───────────────────────────────────
//
// Exported separately so `index.ts` can mount it with `express.raw()`
// BEFORE the global `express.json()` middleware. The Plaid signature
// covers the raw request bytes, so we cannot let JSON parsing happen
// before us.
export const plaidWebhookHandler = [
  webhookLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    // express.raw() puts the raw bytes on req.body as a Buffer
    const buf = req.body as unknown;
    const rawBody = Buffer.isBuffer(buf)
      ? buf.toString('utf8')
      : typeof buf === 'string'
        ? buf
        : JSON.stringify(buf ?? {});

    const ok = await verifyWebhook(req.headers as Record<string, string | string[] | undefined>, rawBody);
    if (!ok) {
      logger.warn('Plaid webhook signature verification failed', {
        ip: req.ip,
      });
      // F5: blank 401 for any signature failure — no oracle.
      res.status(401).end();
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // F5: also 401 for parse failures — same response as a signature
      // failure so an attacker can't distinguish "bad signature" from
      // "bad payload" via timing or status code.
      res.status(401).end();
      return;
    }

    // F3: structurally validate the parsed payload via Zod. Unknown fields
    // pass through — we only enforce shape on the fields we read.
    const parsed = webhookPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      // F5: same 401 response as signature/parse failures.
      logger.warn('Plaid webhook payload failed schema validation', {
        issues: parsed.error.issues.map((i) => ({ path: i.path, code: i.code })),
      });
      res.status(401).end();
      return;
    }

    const {
      webhook_type: webhookType,
      webhook_code: webhookCode,
      item_id: plaidItemExternalId,
      request_id: requestId,
    } = parsed.data;

    // Resolve internal PlaidItem (best effort — webhook may arrive before
    // we've processed the exchange callback)
    const internalItem = plaidItemExternalId
      ? await prisma.plaidItem.findUnique({ where: { plaidItemId: plaidItemExternalId } })
      : null;

    // F20: when Plaid does not give us a `request_id` we still need a stable
    // dedup key, otherwise a re-delivered webhook would be inserted twice.
    // Hash the (item, type, code, signature) tuple — collision risk is
    // negligible and the unique index on externalEventId still catches it.
    const verificationHeader = req.headers['plaid-verification'];
    const verificationStr = Array.isArray(verificationHeader)
      ? verificationHeader.join(',')
      : (verificationHeader ?? '');
    const externalEventId =
      requestId ??
      createHash('sha256')
        .update(`${plaidItemExternalId ?? ''}|${webhookType}|${webhookCode}|${verificationStr}`)
        .digest('hex')
        .slice(0, 64);

    // Dedupe via externalEventId. Duplicate inserts on the unique
    // index → 200 OK, no work enqueued.
    let createdEventId: string | null = null;
    try {
      const event = await prisma.plaidWebhookEvent.create({
        data: {
          plaidItemId: internalItem?.id,
          webhookType,
          webhookCode,
          externalEventId,
          rawPayload: parsed.data as never,
        },
      });
      createdEventId = event.id;
    } catch (err) {
      // If the unique constraint on externalEventId fired, we've already
      // received this webhook — treat as success.
      const code = (err as { code?: string }).code;
      if (code === 'P2002') {
        logger.info('Duplicate Plaid webhook (request_id) — skipping enqueue', {
          externalEventId,
        });
        res.status(200).json({ success: true, data: { duplicate: true } });
        return;
      }
      throw err;
    }

    // F12: ITEM-level webhook codes update the PlaidItem.status so the UI
    // can prompt the user (LOGIN_REQUIRED) or hide a disconnected item.
    if (internalItem?.id && webhookType === 'ITEM') {
      const itemStatusMap: Record<string, PlaidItemStatus> = {
        PENDING_EXPIRATION: 'LOGIN_REQUIRED',
        USER_PERMISSION_REVOKED: 'DISCONNECTED',
        ERROR: 'ERROR',
        LOGIN_REPAIRED: 'ACTIVE',
      };
      const newStatus = itemStatusMap[webhookCode];
      if (newStatus) {
        await prisma.plaidItem.update({
          where: { id: internalItem.id },
          data: {
            status: newStatus,
            errorCode: webhookCode === 'ERROR' ? webhookCode : null,
          },
        });
      }
    }

    // Enqueue an incremental sync for SYNC_UPDATES_AVAILABLE; for other
    // webhook types we still record the event but don't enqueue work.
    if (
      internalItem?.id &&
      webhookType === 'TRANSACTIONS' &&
      (webhookCode === 'SYNC_UPDATES_AVAILABLE' ||
        webhookCode === 'INITIAL_UPDATE' ||
        webhookCode === 'HISTORICAL_UPDATE' ||
        webhookCode === 'DEFAULT_UPDATE')
    ) {
      try {
        await enqueuePlaidJob(JobType.PLAID_INCREMENTAL_SYNC, { plaidItemId: internalItem.id });
        // F8: only bump lastWebhookAt on enqueue success. If enqueue
        // failed, we treat the webhook as not-yet-acted-on so a Plaid
        // retry can re-enqueue it.
        await prisma.plaidItem.update({
          where: { id: internalItem.id },
          data: { lastWebhookAt: new Date() },
        });
      } catch (err) {
        // QA2: enqueue failed AFTER we already wrote the event row. Mark
        // the row FAILED and return 500 so Plaid retries — the unique
        // constraint on externalEventId means the retry is idempotent
        // (it will hit the P2002 dedup branch above).
        logger.error('Failed to enqueue Plaid incremental sync — marking event FAILED', {
          eventId: createdEventId,
          error: (err as Error).message,
        });
        try {
          await prisma.plaidWebhookEvent.update({
            where: { id: createdEventId! },
            data: {
              status: 'FAILED',
              processingError: `enqueue failed: ${(err as Error).message}`.slice(0, 1000),
            },
          });
        } catch (markErr) {
          logger.error('Failed to mark webhook event FAILED after enqueue error', {
            eventId: createdEventId,
            error: (markErr as Error).message,
          });
        }
        res.status(500).json({
          success: false,
          error: { code: 'ENQUEUE_FAILED', message: 'Webhook recorded but processing not scheduled' },
        });
        return;
      }
    } else if (internalItem?.id) {
      // Non-syncable webhooks: still record receipt timestamp.
      await prisma.plaidItem.update({
        where: { id: internalItem.id },
        data: { lastWebhookAt: new Date() },
      });
    }

    res.status(200).json({ success: true, data: { eventId: createdEventId } });
  }),
] as const;

// ── Auth required for everything else ─────────────────────────────
router.use(requireAuth);

// POST /link/token/create
router.post(
  '/link/token/create',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createLinkTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors },
      });
      return;
    }
    const userId = req.user!.userId;
    const meta = extractRequestMeta(req);

    try {
      const result = await createLinkToken(userId, parsed.data.redirectUri);
      await writeAccessLog({
        userId,
        action: 'LINK',
        resource: 'PlaidItem',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        context: { stage: 'token_created' },
      });
      res.json({ success: true, data: result });
    } catch (err) {
      if (err instanceof PlaidError) {
        // F10: never echo Plaid's raw message — sanitise via lookup.
        safePlaidErrorResponse(res, err);
        return;
      }
      throw err;
    }
  }),
);

// POST /link/token/exchange
router.post(
  '/link/token/exchange',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = exchangeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors },
      });
      return;
    }
    const userId = req.user!.userId;
    const meta = extractRequestMeta(req);

    let exchanged: { accessToken: string; itemId: string };
    try {
      exchanged = await exchangePublicToken(parsed.data.publicToken);
    } catch (err) {
      if (err instanceof PlaidError) {
        // F10: never echo Plaid's raw message — sanitise via lookup.
        safePlaidErrorResponse(res, err);
        return;
      }
      throw err;
    }

    // Reject if this Plaid item is already linked to ANY user
    const existingItem = await prisma.plaidItem.findUnique({
      where: { plaidItemId: exchanged.itemId },
    });
    if (existingItem) {
      res.status(409).json({
        success: false,
        error: { code: 'ITEM_ALREADY_LINKED', message: 'This bank account is already linked' },
      });
      return;
    }

    const ciphertext = encryptAccessToken(exchanged.accessToken);

    let createdItemId: string;
    try {
      const created = await prisma.$transaction(async (tx) => {
        const item = await tx.plaidItem.create({
          data: {
            userId,
            plaidItemId: exchanged.itemId,
            accessTokenCiphertext: ciphertext,
            institutionId: parsed.data.institutionId,
            institutionName: parsed.data.institutionName.slice(0, 200),
            status: 'ACTIVE',
          },
        });
        await tx.bankAccount.createMany({
          data: parsed.data.accounts.map((a) => ({
            userId,
            plaidItemId: item.id,
            plaidAccountId: a.id,
            name: a.name.slice(0, 200),
            mask: a.mask?.slice(0, 8) ?? null,
            type: mapPlaidAccountType(a.type),
            subtype: mapPlaidSubtype(a.subtype),
          })),
          skipDuplicates: true,
        });
        return item;
      });
      createdItemId = created.id;
    } finally {
      // Best-effort scrub of in-memory plaintext
      exchanged.accessToken = '';
    }

    await writeAccessLog({
      userId,
      action: 'LINK',
      resource: 'PlaidItem',
      resourceId: createdItemId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      context: { stage: 'exchanged', accountsLinked: parsed.data.accounts.length },
    });

    try {
      await enqueuePlaidJob(JobType.PLAID_INITIAL_SYNC, { plaidItemId: createdItemId });
    } catch (err) {
      logger.warn('Failed to enqueue PLAID_INITIAL_SYNC — continuing', {
        error: (err as Error).message,
      });
    }

    res.status(201).json({
      success: true,
      data: { plaidItemId: createdItemId, accountsLinked: parsed.data.accounts.length },
    });
  }),
);

// GET /items
router.get(
  '/items',
  asyncHandler(async (req: Request, res: Response) => {
    const items = await prisma.plaidItem.findMany({
      where: { userId: req.user!.userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { accounts: { where: { deletedAt: null } } },
    });
    res.json({ success: true, data: items.map(stripCiphertext) });
  }),
);

// DELETE /items/:id
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const meta = extractRequestMeta(req);

    const item = await prisma.plaidItem.findFirst({
      where: { id: req.params.id, userId, deletedAt: null },
    });
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'PlaidItem not found' } });
      return;
    }

    // Best-effort: tell Plaid to revoke the item. We don't fail the request
    // if Plaid is down; we still soft-delete locally so the user sees it gone.
    try {
      const accessToken = (await import('../services/crypto')).decryptAccessToken(
        item.accessTokenCiphertext,
      );
      await removeItem(accessToken);
    } catch (err) {
      const errMsg = (err as Error).message;
      // QA4: a decrypt failure here is not the same as Plaid being down —
      // it implies the ciphertext on disk is corrupt or has been tampered
      // with (e.g. wrong key version, GCM auth-tag mismatch). Escalate
      // to error level so it shows up in alerting.
      const looksLikeDecryptFailure =
        /decrypt|cipher|auth|gcm|key/i.test(errMsg) || (err as { name?: string }).name === 'CryptoError';
      if (looksLikeDecryptFailure) {
        logger.error('TAMPER_SUSPECTED: Plaid access token decrypt failed during /item/remove', {
          plaidItemId: item.id,
          userId,
          error: errMsg,
        });
      } else {
        logger.warn('Plaid /item/remove failed — continuing with local soft delete', {
          plaidItemId: item.id,
          error: errMsg,
        });
      }
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.plaidItem.update({
        where: { id: item.id },
        data: { status: 'DISCONNECTED', deletedAt: now },
      });
      await tx.bankAccount.updateMany({
        where: { plaidItemId: item.id, deletedAt: null },
        data: { deletedAt: now },
      });
      await tx.transaction.updateMany({
        where: { bankAccount: { plaidItemId: item.id }, deletedAt: null },
        data: { deletedAt: now },
      });
    });

    await writeAccessLog({
      userId,
      action: 'UNLINK',
      resource: 'PlaidItem',
      resourceId: item.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    res.json({ success: true, data: { message: 'PlaidItem disconnected' } });
  }),
);

// POST /items/:id/sync
router.post(
  '/:id/sync',
  plaidSyncLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const item = await prisma.plaidItem.findFirst({
      where: { id: req.params.id, userId, deletedAt: null },
    });
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'PlaidItem not found' } });
      return;
    }

    const job = await enqueuePlaidJob(JobType.PLAID_INCREMENTAL_SYNC, { plaidItemId: item.id });

    res.status(202).json({
      success: true,
      data: { jobId: job?.id ?? null, queued: !!job },
    });
  }),
);

export default router;
