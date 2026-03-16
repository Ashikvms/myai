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

const createAppointmentSchema = z.object({
  title: z.string().min(1).max(200),
  dateTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  location: z.string().max(500).optional(),
  notes: z.string().optional(),
  category: z.string().max(50).optional(),
  reminderMinutes: z.number().int().min(0).default(30),
});

const updateAppointmentSchema = createAppointmentSchema.partial();

// ── Routes ────────────────────────────

router.use(requireAuth);

// GET / — list upcoming appointments
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const appointments = await prisma.appointment.findMany({
      where: {
        userId: req.user!.userId,
        dateTime: { gte: new Date() },
      },
      orderBy: { dateTime: 'asc' },
    });

    res.json({ success: true, data: appointments });
  }),
);

// GET /past — list past appointments
router.get(
  '/past',
  asyncHandler(async (req: Request, res: Response) => {
    const appointments = await prisma.appointment.findMany({
      where: {
        userId: req.user!.userId,
        dateTime: { lt: new Date() },
      },
      orderBy: { dateTime: 'desc' },
    });

    res.json({ success: true, data: appointments });
  }),
);

// GET /:id — single appointment
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!appointment) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
      return;
    }

    res.json({ success: true, data: appointment });
  }),
);

// POST / — create appointment
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors } });
      return;
    }

    const appointment = await prisma.appointment.create({
      data: {
        ...parsed.data,
        dateTime: new Date(parsed.data.dateTime),
        endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : undefined,
        userId: req.user!.userId,
      },
    });

    res.status(201).json({ success: true, data: appointment });
  }),
);

// PUT /:id — update appointment
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors } });
      return;
    }

    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
      return;
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.dateTime) data.dateTime = new Date(parsed.data.dateTime);
    if (parsed.data.endTime) data.endTime = new Date(parsed.data.endTime);

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: appointment });
  }),
);

// DELETE /:id — hard delete
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
      return;
    }

    await prisma.appointment.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, data: { message: 'Appointment deleted' } });
  }),
);

export default router;
