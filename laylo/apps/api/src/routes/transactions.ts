import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { extractRequestMeta, writeAccessLog } from '../services/audit-log';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

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

export default router;
