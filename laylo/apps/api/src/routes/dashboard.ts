import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { writeAccessLog, extractRequestMeta } from '../services/audit-log';

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

// Cash-equivalent account types — counted toward `totalBalance` (positive equity).
// CREDIT and LOAN are debt and counted toward `totalDebt` instead.
const CASH_TYPES = new Set(['DEPOSITORY']);
const DEBT_TYPES = new Set(['CREDIT', 'LOAN']);

function toNumberOrNull(v: unknown): number | null {
  if (v == null) return null;
  // Prisma.Decimal exposes toNumber(); plain numbers also work via Number().
  // Fall back to Number(String(v)) to handle Decimal serialised as string.
  const n = Number(typeof (v as { toNumber?: () => number })?.toNumber === 'function'
    ? (v as { toNumber: () => number }).toNumber()
    : v);
  return Number.isFinite(n) ? n : null;
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
      bankAccounts,
      recentTxns,
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

      // bankAccounts: non-deleted, non-hidden, joined to PlaidItem for institution name
      prisma.bankAccount.findMany({
        where: { userId, deletedAt: null, isHidden: false },
        include: {
          plaidItem: { select: { institutionName: true } },
        },
      }),

      // recentTransactions: last 10 across all accounts
      prisma.transaction.findMany({
        where: { userId, deletedAt: null },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 10,
        include: {
          bankAccount: { select: { name: true } },
        },
      }),
    ]);

    const totalMonthlyBills = activeBills.reduce((sum, bill) => {
      return sum + toMonthly(Number(bill.amount), bill.frequency);
    }, 0);

    const totalMonthlySubs = activeSubscriptions.reduce((sum, sub) => {
      return sum + toMonthly(Number(sub.amount), sub.frequency);
    }, 0);

    // ── Connected accounts payload ────
    let totalBalance = 0;
    let totalDebt = 0;
    const accountSummaries = bankAccounts.map((a) => {
      const bal = toNumberOrNull(a.currentBalance);
      if (bal != null) {
        if (CASH_TYPES.has(a.type)) totalBalance += bal;
        else if (DEBT_TYPES.has(a.type)) totalDebt += Math.abs(bal);
      }
      return {
        id: a.id,
        institutionName: a.plaidItem?.institutionName ?? '',
        name: a.name,
        mask: a.mask ?? null,
        type: a.type as string,
        subtype: (a.subtype as string | null) ?? null,
        currentBalance: bal,
        isoCurrencyCode: a.isoCurrencyCode,
      };
    });

    // Top 5 accounts by balance for dashboard tile
    const topAccounts = [...accountSummaries]
      .sort((a, b) => (b.currentBalance ?? -Infinity) - (a.currentBalance ?? -Infinity))
      .slice(0, 5);

    const recentTransactions = recentTxns.map((t) => ({
      id: t.id,
      date: t.date.toISOString().slice(0, 10),
      name: t.name,
      merchantName: t.merchantName ?? null,
      amount: Number(t.amount),
      isoCurrencyCode: t.isoCurrencyCode,
      category: t.category ?? null,
      accountId: t.bankAccountId,
      accountName: t.bankAccount?.name ?? '',
      pending: t.pending,
    }));

    // ── Audit-log the bank-data reads (best-effort, never throws) ────
    if (bankAccounts.length > 0 || recentTxns.length > 0) {
      const meta = extractRequestMeta(req);
      // Two log entries: one for BankAccount, one for Transaction
      await Promise.all([
        writeAccessLog({
          userId,
          actorUserId: userId,
          action: 'READ',
          resource: 'BankAccount',
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          context: { route: 'GET /api/dashboard', count: bankAccounts.length },
        }),
        writeAccessLog({
          userId,
          actorUserId: userId,
          action: 'READ',
          resource: 'Transaction',
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          context: { route: 'GET /api/dashboard', count: recentTxns.length },
        }),
      ]);
    }

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
        connectedAccounts: {
          count: bankAccounts.length,
          totalBalance: Math.round(totalBalance * 100) / 100,
          totalDebt: Math.round(totalDebt * 100) / 100,
          accounts: topAccounts,
        },
        recentTransactions,
      },
    });
  }),
);

export default router;
