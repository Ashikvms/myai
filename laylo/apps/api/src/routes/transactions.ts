import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { requireAuth } from '../middleware/auth';
import { extractRequestMeta, writeAccessLog } from '../services/audit-log';
import { explainTransaction } from '@life-admin/ai';
import type { TransactionExplainerInput } from '@life-admin/ai';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// ── Helpers ───────────────────────────────────────────────────────

function toNumber(d: Prisma.Decimal | number | null | undefined): number {
  if (d == null) return 0;
  if (typeof d === 'number') return d;
  // Prisma Decimal has toNumber()
  return Number((d as Prisma.Decimal).toString());
}

function toIsoDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().split('T')[0]!;
}

// ── List endpoint ─────────────────────────────────────────────────

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  // F9: explicit upper bounds on every text query param. cuids are 25 chars,
  // 40 is a safe ceiling; merchant/category/free-text capped to keep query
  // builder + DB-side regex execution bounded.
  accountId: z.string().min(1).max(40).optional(),
  category: z.string().min(1).max(80).optional(),
  merchant: z.string().min(1).max(100).optional(),
  q: z.string().min(1).max(100).optional(),
  cursor: z.string().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors },
      });
      return;
    }
    const userId = req.user!.userId;
    const { from, to, accountId, category, merchant, q, cursor, limit } = parsed.data;

    const where: Prisma.TransactionWhereInput = {
      userId,
      deletedAt: null,
    };
    if (from || to) {
      where.date = {};
      if (from) (where.date as Prisma.DateTimeFilter).gte = new Date(from);
      if (to) (where.date as Prisma.DateTimeFilter).lte = new Date(to);
    }
    if (accountId) where.bankAccountId = accountId;
    if (category) where.category = category;
    if (merchant) where.merchantName = { contains: merchant, mode: 'insensitive' };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { merchantName: { contains: q, mode: 'insensitive' } },
      ];
    }

    // If accountId is supplied, ensure it belongs to this user (prevents IDOR
    // via crafted accountId for transactions the user doesn't actually own —
    // we already filter by userId so this is defense-in-depth).
    if (accountId) {
      const account = await prisma.bankAccount.findFirst({
        where: { id: accountId, userId, deletedAt: null },
        select: { id: true },
      });
      if (!account) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Account not found' },
        });
        return;
      }
    }

    // Cursor-based pagination on Transaction.id (stable, unique).
    const items = await prisma.transaction.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const next = items.pop();
      nextCursor = next?.id ?? null;
    }

    const meta = extractRequestMeta(req);
    await writeAccessLog({
      userId,
      action: 'READ',
      resource: 'Transaction',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      context: {
        count: items.length,
        filters: {
          from,
          to,
          accountId,
          category,
          merchant: merchant ? '<set>' : undefined,
          q: q ? '<set>' : undefined,
        },
      },
    });

    res.json({ success: true, data: { items, nextCursor } });
  }),
);

// ── Detail endpoint (Item 28) ─────────────────────────────────────
//
// Returns a single transaction enriched with:
//   - bankAccount (incl. institutionName from PlaidItem)
//   - linked bill / subscription (if any)
//   - 30-day spending pattern at the same merchant for this user
//
// Audit-logged as a Transaction READ. Cross-user requests return 404
// (NOT 403) per project IDOR convention.

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id!;

    const txn = await prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        bankAccount: {
          include: {
            plaidItem: {
              select: { institutionName: true },
            },
          },
        },
        bill: { select: { id: true, name: true, amount: true, frequency: true } },
        subscription: {
          select: { id: true, name: true, amount: true, frequency: true },
        },
      },
    });

    if (!txn) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
      });
      return;
    }

    // Pattern: charges at the SAME merchant for the SAME user in the last
    // 30 days. Match prefers merchantName, falls back to raw transaction
    // name. Case-insensitive equality (a `contains` match would over-count
    // generic merchant fragments like "Amazon").
    const merchantNeedle = (txn.merchantName ?? txn.name ?? '').trim();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const merchantWhere: Prisma.TransactionWhereInput = merchantNeedle
      ? {
          userId,
          deletedAt: null,
          OR: [
            { merchantName: { equals: merchantNeedle, mode: 'insensitive' } },
            { name: { equals: merchantNeedle, mode: 'insensitive' } },
          ],
        }
      : { userId, deletedAt: null, id: txn.id };

    const [last30, earliestRow] = await Promise.all([
      prisma.transaction.findMany({
        where: { ...merchantWhere, date: { gte: thirtyDaysAgo } },
        select: { amount: true },
      }),
      prisma.transaction.findFirst({
        where: { ...merchantWhere, date: { gte: ninetyDaysAgo } },
        orderBy: { date: 'asc' },
        select: { date: true },
      }),
    ]);

    const txCount = last30.length;
    const totalSpent = last30.reduce((sum, row) => sum + toNumber(row.amount), 0);
    const avgAmount = txCount === 0 ? 0 : totalSpent / txCount;

    // Defensive: never echo accessTokenCiphertext (lives on PlaidItem). Our
    // include only selected institutionName, but be paranoid in case Prisma
    // ever returns extra fields.
    const institutionName = txn.bankAccount.plaidItem?.institutionName ?? null;

    const data = {
      transaction: {
        id: txn.id,
        plaidTransactionId: txn.plaidTransactionId,
        amount: toNumber(txn.amount),
        isoCurrencyCode: txn.isoCurrencyCode,
        date: toIsoDate(txn.date),
        authorizedDate: toIsoDate(txn.authorizedDate),
        name: txn.name,
        merchantName: txn.merchantName,
        merchantLogoUrl: txn.merchantLogoUrl,
        category: txn.category,
        categoryDetailed: txn.categoryDetailed,
        paymentChannel: txn.paymentChannel,
        pending: txn.pending,
        isoLocationCity: txn.isoLocationCity,
        isoLocationRegion: txn.isoLocationRegion,
        isoLocationCountry: txn.isoLocationCountry,
        userNote: txn.userNote,
        receiptUrl: txn.receiptUrl,
        userVerifiedMatch: txn.userVerifiedMatch,
        bankAccount: {
          id: txn.bankAccount.id,
          name: txn.bankAccount.name,
          mask: txn.bankAccount.mask,
          type: txn.bankAccount.type,
          subtype: txn.bankAccount.subtype,
          institutionName,
        },
        bill: txn.bill
          ? {
              id: txn.bill.id,
              name: txn.bill.name,
              amount: toNumber(txn.bill.amount),
              frequency: txn.bill.frequency,
            }
          : null,
        subscription: txn.subscription
          ? {
              id: txn.subscription.id,
              name: txn.subscription.name,
              amount: toNumber(txn.subscription.amount),
              frequency: txn.subscription.frequency,
            }
          : null,
      },
      pattern: {
        merchantName: merchantNeedle,
        txCount,
        totalSpent,
        avgAmount,
        firstSeen: toIsoDate(earliestRow?.date ?? null),
      },
    };

    const meta = extractRequestMeta(req);
    await writeAccessLog({
      userId,
      action: 'READ',
      resource: 'Transaction',
      resourceId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      context: { detailFetch: true },
    });

    res.json({ success: true, data });
  }),
);

// ── Note endpoint (Item 28) ───────────────────────────────────────
//
// Set or clear the user's free-text note on a transaction. `null` or
// empty string clears it. Strict schema rejects unknown keys to prevent
// mass-assignment.

const noteSchema = z
  .object({
    note: z.string().max(2000).nullable(),
  })
  .strict();

router.patch(
  '/:id/note',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id!;

    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors },
      });
      return;
    }

    // Verify ownership first (404 on cross-user, not 403 — IDOR convention).
    const existing = await prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
      });
      return;
    }

    const noteValue =
      parsed.data.note == null || parsed.data.note.trim() === ''
        ? null
        : parsed.data.note;

    const updated = await prisma.transaction.update({
      where: { id },
      data: { userNote: noteValue },
      select: { id: true, userNote: true },
    });

    const meta = extractRequestMeta(req);
    await writeAccessLog({
      userId,
      action: 'WRITE',
      resource: 'Transaction',
      resourceId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      context: { field: 'userNote', cleared: noteValue == null },
    });

    res.json({ success: true, data: updated });
  }),
);

// ── AI explain endpoint (Item 28) ─────────────────────────────────
//
// Mounted under /api/ai/explain-transaction/:id (see aiExplainTransactionRouter
// below) per the public API path. Generates a 2-3 sentence friendly
// explanation of the charge. Falls back to a hand-written mock when the
// Anthropic key is the dev placeholder so local dev does not burn tokens.

const explainSchema = z
  .object({
    extraContext: z.string().max(500).optional(),
  })
  .strict()
  .partial();

async function explainTransactionHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = req.params.id!;

  // Body is optional; if present, validate strictly.
  const body = req.body ?? {};
  const parsed = explainSchema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors },
    });
    return;
  }

  const txn = await prisma.transaction.findFirst({
    where: { id, userId, deletedAt: null },
  });
  if (!txn) {
    // 404 on cross-user (IDOR convention).
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Transaction not found' },
    });
    return;
  }

  // Compute the same 30-day pattern stats as GET /:id so the prompt has
  // useful context.
  const merchantNeedle = (txn.merchantName ?? txn.name ?? '').trim();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const merchantWhere: Prisma.TransactionWhereInput = merchantNeedle
    ? {
        userId,
        deletedAt: null,
        OR: [
          { merchantName: { equals: merchantNeedle, mode: 'insensitive' } },
          { name: { equals: merchantNeedle, mode: 'insensitive' } },
        ],
      }
    : { userId, deletedAt: null, id: txn.id };

  const [last30, earliestRow] = await Promise.all([
    prisma.transaction.findMany({
      where: { ...merchantWhere, date: { gte: thirtyDaysAgo } },
      select: { amount: true },
    }),
    prisma.transaction.findFirst({
      where: { ...merchantWhere, date: { gte: ninetyDaysAgo } },
      orderBy: { date: 'asc' },
      select: { date: true },
    }),
  ]);

  const txCount = last30.length;
  const totalSpent = last30.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const avgAmount = txCount === 0 ? 0 : totalSpent / txCount;

  const explainerInput: TransactionExplainerInput = {
    transaction: {
      name: txn.name,
      merchantName: txn.merchantName,
      amount: toNumber(txn.amount),
      isoCurrencyCode: txn.isoCurrencyCode,
      date: toIsoDate(txn.date) ?? '',
      category: txn.category,
      categoryDetailed: txn.categoryDetailed,
      paymentChannel: txn.paymentChannel,
      isoLocationCity: txn.isoLocationCity,
      isoLocationRegion: txn.isoLocationRegion,
      isoLocationCountry: txn.isoLocationCountry,
    },
    pattern: {
      merchantName: merchantNeedle,
      txCount,
      totalSpent,
      avgAmount,
      firstSeen: toIsoDate(earliestRow?.date ?? null),
    },
    extraContext: parsed.data.extraContext,
  };

  const result = await explainTransaction(explainerInput, {
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.CLAUDE_MODEL,
  });

  const meta = extractRequestMeta(req);
  // Two audit entries: the underlying Transaction READ + the AI generation.
  await writeAccessLog({
    userId,
    action: 'READ',
    resource: 'Transaction',
    resourceId: id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    context: { reason: 'aiExplain' },
  });
  await writeAccessLog({
    userId,
    action: 'SYNC',
    resource: 'AI_Explanation',
    resourceId: id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    context: { mock: result.mock },
  });

  res.json({ success: true, data: result });
}

export const aiExplainTransactionRouter = Router();
aiExplainTransactionRouter.use(requireAuth);
aiExplainTransactionRouter.post(
  '/explain-transaction/:id',
  asyncHandler(explainTransactionHandler),
);

export default router;
