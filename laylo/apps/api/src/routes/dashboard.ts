import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
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

// ── Routes ────────────────────────────

router.use(requireAuth);

// GET / — aggregated dashboard data
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    const [
      pendingTasks,
      todayTasks,
      billsDueSoon,
      activeBills,
      activeSubscriptions,
      upcomingAppointments,
      pendingReminders,
      expiringDocuments,
      recentDocuments,
    ] = await Promise.all([
      // pendingTasks: count of non-completed, non-deleted tasks
      prisma.task.count({
        where: { userId, deletedAt: null, status: { not: 'COMPLETED' } },
      }),

      // todayTasks: tasks due today
      prisma.task.findMany({
        where: {
          userId,
          deletedAt: null,
          dueDate: { gte: startOfDay, lt: endOfDay },
        },
        orderBy: { dueDate: 'asc' },
      }),

      // billsDueSoon: bills due within 7 days
      prisma.bill.findMany({
        where: {
          userId,
          deletedAt: null,
          status: 'ACTIVE',
          nextDueDate: { gte: now, lte: sevenDaysFromNow },
        },
        orderBy: { nextDueDate: 'asc' },
      }),

      // activeBills: all active bills for monthly calculation
      prisma.bill.findMany({
        where: { userId, deletedAt: null, status: 'ACTIVE' },
      }),

      // activeSubscriptions: all active subscriptions
      prisma.subscription.findMany({
        where: { userId, deletedAt: null, status: 'ACTIVE' },
      }),

      // upcomingAppointments: next 5
      prisma.appointment.findMany({
        where: { userId, dateTime: { gte: now } },
        orderBy: { dateTime: 'asc' },
        take: 5,
      }),

      // pendingReminders: count
      prisma.reminder.count({
        where: { userId, status: 'PENDING' },
      }),

      // expiringDocuments: within 60 days
      prisma.document.findMany({
        where: {
          userId,
          deletedAt: null,
          expirationDate: { gte: now, lte: sixtyDaysFromNow },
        },
        orderBy: { expirationDate: 'asc' },
      }),

      // recentDocuments: last 5 added
      prisma.document.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const totalMonthlyBills = activeBills.reduce((sum, bill) => {
      return sum + toMonthly(Number(bill.amount), bill.frequency);
    }, 0);

    const totalMonthlySubs = activeSubscriptions.reduce((sum, sub) => {
      return sum + toMonthly(Number(sub.amount), sub.frequency);
    }, 0);

    res.json({
      success: true,
      data: {
        pendingTasks,
        todayTasks,
        billsDueSoon,
        totalMonthlyBills: Math.round(totalMonthlyBills * 100) / 100,
        totalMonthlySubs: Math.round(totalMonthlySubs * 100) / 100,
        activeSubscriptions: activeSubscriptions.length,
        upcomingAppointments,
        pendingReminders,
        expiringDocuments,
        recentDocuments,
      },
    });
  }),
);

export default router;
