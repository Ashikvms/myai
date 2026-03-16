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

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

const updateNotificationsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  billReminders: z.boolean().optional(),
  appointmentReminders: z.boolean().optional(),
  documentExpiry: z.boolean().optional(),
  taskReminders: z.boolean().optional(),
  reminderLeadDays: z.number().int().min(0).max(30).optional(),
  pushToken: z.string().nullable().optional(),
});

// ── Routes ────────────────────────────

router.use(requireAuth);

// GET /profile — return user profile
router.get(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        plan: true,
        onboardingComplete: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    res.json({ success: true, data: user });
  }),
);

// PUT /profile — update profile
router.put(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors } });
      return;
    }

    if (parsed.data.email) {
      const existing = await prisma.user.findFirst({
        where: { email: parsed.data.email, id: { not: req.user!.userId } },
      });
      if (existing) {
        res.status(400).json({ success: false, error: { code: 'EMAIL_TAKEN', message: 'Email is already in use' } });
        return;
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        plan: true,
        onboardingComplete: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: user });
  }),
);

// GET /notifications — return notification preferences
router.get(
  '/notifications',
  asyncHandler(async (req: Request, res: Response) => {
    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!prefs) {
      // Create default preferences if none exist
      prefs = await prisma.notificationPreference.create({
        data: { userId: req.user!.userId },
      });
    }

    res.json({ success: true, data: prefs });
  }),
);

// PUT /notifications — update notification preferences
router.put(
  '/notifications',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateNotificationsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors } });
      return;
    }

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: req.user!.userId },
      update: parsed.data,
      create: {
        userId: req.user!.userId,
        ...parsed.data,
      },
    });

    res.json({ success: true, data: prefs });
  }),
);

export default router;
