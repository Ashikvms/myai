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

// ── Validation schemas ────────────────

const createReminderSchema = z.object({
  title: z.string().min(1).max(200),
  dateTime: z.string().datetime(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
  linkedType: z.enum(['TASK', 'BILL', 'SUBSCRIPTION', 'APPOINTMENT', 'DOCUMENT', 'NONE']).default('NONE'),
  linkedId: z.string().optional(),
});

const updateReminderSchema = createReminderSchema.partial().extend({
  status: z.enum(['PENDING', 'SENT', 'DISMISSED']).optional(),
});

// ── Routes ────────────────────────────

router.use(requireAuth);

// GET / — list reminders
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query;

    const where: Record<string, unknown> = {
      userId: req.user!.userId,
    };

    if (status) where.status = status as string;

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: { dateTime: 'asc' },
    });

    res.json({ success: true, data: reminders });
  }),
);

// GET /:id — single reminder
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const reminder = await prisma.reminder.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!reminder) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reminder not found' } });
      return;
    }

    res.json({ success: true, data: reminder });
  }),
);

// POST / — create reminder
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createReminderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors } });
      return;
    }

    const reminder = await prisma.reminder.create({
      data: {
        ...parsed.data,
        dateTime: new Date(parsed.data.dateTime),
        userId: req.user!.userId,
      },
    });

    res.status(201).json({ success: true, data: reminder });
  }),
);

// PUT /:id — update reminder
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateReminderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors } });
      return;
    }

    const existing = await prisma.reminder.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reminder not found' } });
      return;
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.dateTime) data.dateTime = new Date(parsed.data.dateTime);

    const reminder = await prisma.reminder.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: reminder });
  }),
);

// PUT /:id/dismiss — dismiss reminder
router.put(
  '/:id/dismiss',
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.reminder.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reminder not found' } });
      return;
    }

    const reminder = await prisma.reminder.update({
      where: { id: req.params.id },
      data: { status: 'DISMISSED' },
    });

    res.json({ success: true, data: reminder });
  }),
);

// DELETE /:id — hard delete
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.reminder.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reminder not found' } });
      return;
    }

    await prisma.reminder.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, data: { message: 'Reminder deleted' } });
  }),
);

export default router;
