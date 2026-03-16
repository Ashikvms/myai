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

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  category: z.string().max(50).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
});

// ── Routes ────────────────────────────

router.use(requireAuth);

// GET / — list tasks
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { status, priority, category, filter } = req.query;
    const userId = req.user!.userId;

    const where: Record<string, unknown> = {
      userId,
      deletedAt: null,
    };

    if (status) where.status = status as string;
    if (priority) where.priority = priority as string;
    if (category) where.category = category as string;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    if (filter === 'today') {
      where.dueDate = { gte: startOfDay, lt: endOfDay };
    } else if (filter === 'upcoming') {
      where.dueDate = { gte: endOfDay };
    } else if (filter === 'overdue') {
      where.dueDate = { lt: startOfDay };
      where.status = { not: 'COMPLETED' };
    } else if (filter === 'completed') {
      where.status = 'COMPLETED';
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ success: true, data: tasks });
  }),
);

// GET /:id — single task
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
        deletedAt: null,
      },
    });

    if (!task) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
      return;
    }

    res.json({ success: true, data: task });
  }),
);

// POST / — create task
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors } });
      return;
    }

    const task = await prisma.task.create({
      data: {
        ...parsed.data,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
        userId: req.user!.userId,
      },
    });

    res.status(201).json({ success: true, data: task });
  }),
);

// PUT /:id — update task
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors } });
      return;
    }

    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
      return;
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.dueDate) data.dueDate = new Date(parsed.data.dueDate);

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: task });
  }),
);

// PUT /:id/complete — mark completed
router.put(
  '/:id/complete',
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
      return;
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    res.json({ success: true, data: task });
  }),
);

// DELETE /:id — soft delete
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
      return;
    }

    await prisma.task.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true, data: { message: 'Task deleted' } });
  }),
);

export default router;
