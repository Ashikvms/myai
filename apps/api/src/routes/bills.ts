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

const createBillSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  amount: z.number().positive(),
  frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']),
  nextDueDate: z.string().datetime(),
  isAutopay: z.boolean().default(false),
  notes: z.string().optional(),
});

const updateBillSchema = createBillSchema.partial().extend({
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']).optional(),
});

// ── Routes ────────────────────────────

router.use(requireAuth);

// GET / — list bills
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query;

    const where: Record<string, unknown> = {
      userId: req.user!.userId,
      deletedAt: null,
    };

    if (status) where.status = status as string;

    const bills = await prisma.bill.findMany({
      where,
      orderBy: { nextDueDate: 'asc' },
    });

    res.json({ success: true, data: bills });
  }),
);

// GET /summary — bill summary
router.get(
  '/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const bills = await prisma.bill.findMany({
      where: { userId, deletedAt: null, status: 'ACTIVE' },
    });

    const totalMonthly = bills.reduce((sum, bill) => {
      return sum + toMonthly(Number(bill.amount), bill.frequency);
    }, 0);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const dueSoon = bills.filter(
      (bill) => bill.nextDueDate <= sevenDaysFromNow && bill.nextDueDate >= new Date(),
    );

    res.json({
      success: true,
      data: {
        totalMonthly: Math.round(totalMonthly * 100) / 100,
        dueSoon,
        count: bills.length,
      },
    });
  }),
);

// GET /:id — single bill
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const bill = await prisma.bill.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, deletedAt: null },
    });

    if (!bill) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bill not found' } });
      return;
    }

    res.json({ success: true, data: bill });
  }),
);

// POST / — create bill
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createBillSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors } });
      return;
    }

    const bill = await prisma.bill.create({
      data: {
        ...parsed.data,
        nextDueDate: new Date(parsed.data.nextDueDate),
        userId: req.user!.userId,
      },
    });

    res.status(201).json({ success: true, data: bill });
  }),
);

// PUT /:id — update bill
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateBillSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors } });
      return;
    }

    const existing = await prisma.bill.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bill not found' } });
      return;
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.nextDueDate) data.nextDueDate = new Date(parsed.data.nextDueDate);

    const bill = await prisma.bill.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: bill });
  }),
);

// DELETE /:id — soft delete
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.bill.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bill not found' } });
      return;
    }

    await prisma.bill.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true, data: { message: 'Bill deleted' } });
  }),
);

export default router;
