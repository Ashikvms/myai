import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function toMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case 'WEEKLY': return amount * 52 / 12;
    case 'BIWEEKLY': return amount * 26 / 12;
    case 'MONTHLY': return amount;
    case 'QUARTERLY': return amount / 3;
    case 'ANNUALLY': return amount / 12;
    default: return amount;
  }
}

// ── Validation schemas ────────────────

const createSubscriptionSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  amount: z.number().positive(),
  frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']),
  nextRenewalDate: z.string().datetime(),
  isAutopay: z.boolean().default(false),
  notes: z.string().optional(),
});

const updateSubscriptionSchema = createSubscriptionSchema.partial().extend({
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']).optional(),
  cancellationDate: z.string().datetime().nullable().optional(),
});

// ── Routes ────────────────────────────

router.use(requireAuth);

// GET / — list subscriptions
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: req.user!.userId,
        deletedAt: null,
      },
      orderBy: { nextRenewalDate: 'asc' },
    });

    res.json({ success: true, data: subscriptions });
  }),
);

// GET /summary — subscription summary
router.get(
  '/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const subscriptions = await prisma.subscription.findMany({
      where: { userId, deletedAt: null, status: 'ACTIVE' },
    });

    const totalMonthly = subscriptions.reduce((sum, sub) => {
      return sum + toMonthly(Number(sub.amount), sub.frequency);
    }, 0);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const renewingSoon = subscriptions.filter(
      (sub) => sub.nextRenewalDate <= sevenDaysFromNow && sub.nextRenewalDate >= new Date(),
    );

    res.json({
      success: true,
      data: {
        totalMonthly: Math.round(totalMonthly * 100) / 100,
        renewingSoon,
        count: subscriptions.length,
      },
    });
  }),
);

// GET /:id — single subscription
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const subscription = await prisma.subscription.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, deletedAt: null },
    });

    if (!subscription) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Subscription not found' } });
      return;
    }

    res.json({ success: true, data: subscription });
  }),
);

// POST / — create subscription
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors } });
      return;
    }

    const subscription = await prisma.subscription.create({
      data: {
        ...parsed.data,
        nextRenewalDate: new Date(parsed.data.nextRenewalDate),
        userId: req.user!.userId,
      },
    });

    res.status(201).json({ success: true, data: subscription });
  }),
);

// PUT /:id — update subscription
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors } });
      return;
    }

    const existing = await prisma.subscription.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Subscription not found' } });
      return;
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.nextRenewalDate) data.nextRenewalDate = new Date(parsed.data.nextRenewalDate);
    if (parsed.data.cancellationDate) data.cancellationDate = new Date(parsed.data.cancellationDate);
    if (parsed.data.cancellationDate === null) data.cancellationDate = null;

    const subscription = await prisma.subscription.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: subscription });
  }),
);

// DELETE /:id — soft delete
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.subscription.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Subscription not found' } });
      return;
    }

    await prisma.subscription.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true, data: { message: 'Subscription deleted' } });
  }),
);

export default router;
