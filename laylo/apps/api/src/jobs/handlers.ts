import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../config/prisma';
import { notifyUser } from '../services/notifications';
import {
  billReminderTemplate,
  documentExpiryTemplate,
  reminderTemplate,
} from '../services/email-templates';
import { syncItem } from '../services/transaction-sync';
import { decryptAccessToken } from '../services/crypto';
import { getBalances } from '../services/plaid';
import { writeAccessLog } from '../services/audit-log';

// ── Helpers for daily-insights txn enrichment ───────────────

/**
 * Convert Plaid PFC categories (e.g. "FOOD_AND_DRINK") into something the LLM
 * sees as natural prose. We never expose the raw value to users elsewhere; this
 * is a display-only normalisation for the prompt.
 */
function humanizeCategory(c: string | null | undefined): string {
  if (!c) return 'Uncategorised';
  return c
    .toLowerCase()
    .split('_')
    .map((w) => (w.length > 0 ? (w[0]!).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// ── Check Due Bills ──────────────────────

export async function checkDueBills(): Promise<void> {
  logger.info('Job: checkDueBills started');

  try {
    const now = new Date();

    // Get all users with their notification preferences
    const preferences = await prisma.notificationPreference.findMany({
      where: { billReminders: true },
      include: { user: true },
    });

    for (const pref of preferences) {
      const leadDays = pref.reminderLeadDays;
      const windowEnd = new Date(now);
      windowEnd.setDate(windowEnd.getDate() + leadDays);

      const bills = await prisma.bill.findMany({
        where: {
          userId: pref.userId,
          status: 'ACTIVE',
          deletedAt: null,
          nextDueDate: {
            gte: now, // Only future due dates
            lte: windowEnd, // Within the reminder window
          },
        },
      });

      for (const bill of bills) {
        const dueDate = bill.nextDueDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        const amount = Number(bill.amount);
        const subject = `Bill Reminder: ${bill.name} due ${dueDate}`;
        const html = billReminderTemplate(bill.name, amount, dueDate);

        await notifyUser(pref.userId, subject, html, {
          type: 'BILL_REMINDER',
          billId: bill.id,
        });

        logger.info('Bill reminder sent', { billId: bill.id, userId: pref.userId });
      }
    }

    logger.info('Job: checkDueBills completed');
  } catch (err) {
    logger.error('Job: checkDueBills failed', { error: (err as Error).message });
  }
}

// ── Check Expiring Documents ─────────────

export async function checkExpiringDocs(): Promise<void> {
  logger.info('Job: checkExpiringDocs started');

  try {
    const now = new Date();
    const thirtyDaysOut = new Date(now);
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

    // Get users who have documentExpiry enabled
    const preferences = await prisma.notificationPreference.findMany({
      where: { documentExpiry: true },
      select: { userId: true },
    });

    const userIds = preferences.map((p) => p.userId);

    const documents = await prisma.document.findMany({
      where: {
        userId: { in: userIds },
        deletedAt: null,
        expirationDate: {
          gte: now,
          lte: thirtyDaysOut,
        },
      },
    });

    for (const doc of documents) {
      const expiryDate = doc.expirationDate!.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      const subject = `Document Expiring: ${doc.title}`;
      const html = documentExpiryTemplate(doc.title, expiryDate);

      await notifyUser(doc.userId, subject, html, {
        type: 'DOCUMENT_EXPIRY',
        documentId: doc.id,
      });

      logger.info('Document expiry reminder sent', { documentId: doc.id, userId: doc.userId });
    }

    logger.info('Job: checkExpiringDocs completed');
  } catch (err) {
    logger.error('Job: checkExpiringDocs failed', { error: (err as Error).message });
  }
}

// ── Check Due Reminders ──────────────────

export async function checkDueReminders(): Promise<void> {
  logger.info('Job: checkDueReminders started');

  try {
    const now = new Date();

    const reminders = await prisma.reminder.findMany({
      where: {
        status: 'PENDING',
        dateTime: { lte: now },
      },
    });

    for (const reminder of reminders) {
      const subject = `Reminder: ${reminder.title}`;
      const html = reminderTemplate(reminder.title);

      await notifyUser(reminder.userId, subject, html, {
        type: 'REMINDER',
        reminderId: reminder.id,
      });

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: 'SENT' },
      });

      logger.info('Reminder sent and marked SENT', {
        reminderId: reminder.id,
        userId: reminder.userId,
      });
    }

    logger.info('Job: checkDueReminders completed');
  } catch (err) {
    logger.error('Job: checkDueReminders failed', { error: (err as Error).message });
  }
}

// ── Generate Daily Insights ──────────────

export async function generateDailyInsights(): Promise<void> {
  logger.info('Job: generateDailyInsights started');

  if (!env.ANTHROPIC_API_KEY) {
    logger.warn('ANTHROPIC_API_KEY not configured — skipping daily insights');
    return;
  }

  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true },
    });

    for (const user of users) {
      try {
        const now = new Date();
        const weekFromNow = new Date(now);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [
          tasks,
          bills,
          subscriptions,
          documents,
          appointments,
          reminders,
          bankAccountCount,
          last7dTxns,
          newAutoDetectedBills,
          newAutoDetectedSubs,
        ] = await Promise.all([
          prisma.task.findMany({
            where: { userId: user.id, deletedAt: null, status: { not: 'COMPLETED' } },
            take: 20,
            orderBy: { dueDate: 'asc' },
          }),
          prisma.bill.findMany({
            where: {
              userId: user.id,
              deletedAt: null,
              status: 'ACTIVE',
              nextDueDate: { lte: weekFromNow },
            },
            orderBy: { nextDueDate: 'asc' },
          }),
          prisma.subscription.findMany({
            where: {
              userId: user.id,
              deletedAt: null,
              status: 'ACTIVE',
              nextRenewalDate: { lte: weekFromNow },
            },
            orderBy: { nextRenewalDate: 'asc' },
          }),
          prisma.document.findMany({
            where: {
              userId: user.id,
              deletedAt: null,
              expirationDate: { lte: weekFromNow, gte: now },
            },
          }),
          prisma.appointment.findMany({
            where: {
              userId: user.id,
              dateTime: { gte: now, lte: weekFromNow },
            },
            orderBy: { dateTime: 'asc' },
          }),
          prisma.reminder.findMany({
            where: {
              userId: user.id,
              status: 'PENDING',
              dateTime: { lte: weekFromNow },
            },
            orderBy: { dateTime: 'asc' },
          }),
          // Has the user linked any banks? Used to gate the txn block of the
          // prompt so we don't mislead the LLM with empty financial data.
          prisma.bankAccount.count({
            where: { userId: user.id, deletedAt: null },
          }),
          // Last 7 days of (non-deleted) transactions, used for category /
          // total / pending aggregations.
          prisma.transaction.findMany({
            where: {
              userId: user.id,
              deletedAt: null,
              date: { gte: sevenDaysAgo },
            },
            select: {
              amount: true,
              category: true,
              pending: true,
            },
          }),
          prisma.bill.count({
            where: {
              userId: user.id,
              deletedAt: null,
              autoDetected: true,
              createdAt: { gte: sevenDaysAgo },
            },
          }),
          prisma.subscription.count({
            where: {
              userId: user.id,
              deletedAt: null,
              autoDetected: true,
              createdAt: { gte: sevenDaysAgo },
            },
          }),
        ]);

        // ── Aggregate the txn block ────
        // Plaid convention: positive amount = outflow (spend), negative = inflow (income).
        let totalSpend7d = 0;
        let totalIncome7d = 0;
        let pendingCount = 0;
        const categoryTotals = new Map<string, number>();
        for (const t of last7dTxns) {
          const amt = Number(t.amount);
          if (t.pending) pendingCount += 1;
          if (amt > 0) {
            totalSpend7d += amt;
            const key = t.category ?? 'UNCATEGORIZED';
            categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + amt);
          } else if (amt < 0) {
            totalIncome7d += -amt;
          }
        }
        const topCategories = Array.from(categoryTotals.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([cat, total]) => ({
            category: humanizeCategory(cat),
            total: Math.round(total * 100) / 100,
          }));

        const transactionsBlock =
          bankAccountCount > 0
            ? {
                last7Days: {
                  totalSpend: Math.round(totalSpend7d * 100) / 100,
                  totalIncome: Math.round(totalIncome7d * 100) / 100,
                  pendingCount,
                  topCategories,
                  newAutoDetectedBills,
                  newAutoDetectedSubscriptions: newAutoDetectedSubs,
                },
              }
            : undefined; // omit entirely for users with no banks linked

        const context: Record<string, unknown> = {
          userName: user.name,
          pendingTasks: tasks.length,
          upcomingBills: bills.map((b) => ({
            name: b.name,
            amount: Number(b.amount),
            dueDate: b.nextDueDate.toISOString(),
          })),
          renewingSubscriptions: subscriptions.map((s) => ({
            name: s.name,
            amount: Number(s.amount),
            renewalDate: s.nextRenewalDate.toISOString(),
          })),
          expiringDocuments: documents.map((d) => ({
            title: d.title,
            expirationDate: d.expirationDate?.toISOString(),
          })),
          upcomingAppointments: appointments.map((a) => ({
            title: a.title,
            dateTime: a.dateTime.toISOString(),
            location: a.location,
          })),
          pendingReminders: reminders.length,
        };
        if (transactionsBlock) {
          context.transactions = transactionsBlock;
          // Audit-log the txn read used to enrich insights. System-driven, so
          // actorUserId differs from userId.
          await writeAccessLog({
            userId: user.id,
            actorUserId: 'system:generateDailyInsights',
            action: 'READ',
            resource: 'Transaction',
            context: {
              jobName: 'generateDailyInsights',
              count: last7dTxns.length,
              windowDays: 7,
            },
          });
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: env.CLAUDE_MODEL,
            max_tokens: 500,
            messages: [
              {
                role: 'user',
                content: `You are a personal life admin assistant. Based on the following context, provide a brief daily insight summary (2-3 sentences) with the most important things for the user to focus on today. Be concise and actionable.\n\nContext: ${JSON.stringify(context)}`,
              },
            ],
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          logger.error('Claude API error for daily insights', {
            userId: user.id,
            status: response.status,
            body,
          });
          continue;
        }

        const result = await response.json();
        const insightText =
          result.content?.[0]?.type === 'text' ? result.content[0].text : 'No insights generated';

        // V2: Store insights in database. For now, just log them.
        logger.info('Daily insight generated', {
          userId: user.id,
          insight: insightText,
        });
      } catch (err) {
        logger.error('Failed to generate insight for user', {
          userId: user.id,
          error: (err as Error).message,
        });
        // Continue with next user
      }
    }

    logger.info('Job: generateDailyInsights completed');
  } catch (err) {
    logger.error('Job: generateDailyInsights failed', { error: (err as Error).message });
  }
}

// ── Plaid: initial sync ─────────────────────

/**
 * Run a /transactions/sync against an item until cursor exhaustion.
 * Used right after a successful link/exchange.
 */
export async function plaidInitialSync(plaidItemId: string): Promise<void> {
  logger.info('Job: plaidInitialSync started', { plaidItemId });
  try {
    const result = await syncItem(plaidItemId);
    logger.info('Job: plaidInitialSync completed', { plaidItemId, ...result });
  } catch (err) {
    logger.error('Job: plaidInitialSync failed', {
      plaidItemId,
      error: (err as Error).message,
    });
    throw err;
  }
}

// ── Plaid: incremental sync (webhook + manual) ──

export async function plaidIncrementalSync(plaidItemId: string): Promise<void> {
  logger.info('Job: plaidIncrementalSync started', { plaidItemId });
  try {
    const result = await syncItem(plaidItemId);
    logger.info('Job: plaidIncrementalSync completed', { plaidItemId, ...result });
  } catch (err) {
    logger.error('Job: plaidIncrementalSync failed', {
      plaidItemId,
      error: (err as Error).message,
    });
    throw err;
  }
}

// ── Plaid: daily balance refresh ────────────

export async function plaidRebalance(): Promise<void> {
  logger.info('Job: plaidRebalance started');
  try {
    const items = await prisma.plaidItem.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      include: { accounts: { where: { deletedAt: null } } },
    });

    let updated = 0;
    for (const item of items) {
      let perItemUpdated = 0;
      try {
        const accessToken = decryptAccessToken(item.accessTokenCiphertext);
        const accounts = await getBalances(accessToken);
        const byPlaidId = new Map(accounts.map((a) => [a.account_id, a]));
        const now = new Date();

        for (const local of item.accounts) {
          const remote = byPlaidId.get(local.plaidAccountId);
          if (!remote?.balances) continue;
          await prisma.bankAccount.update({
            where: { id: local.id },
            data: {
              currentBalance:
                remote.balances.current != null
                  ? new Prisma.Decimal(remote.balances.current.toString())
                  : null,
              availableBalance:
                remote.balances.available != null
                  ? new Prisma.Decimal(remote.balances.available.toString())
                  : null,
              creditLimit:
                remote.balances.limit != null
                  ? new Prisma.Decimal(remote.balances.limit.toString())
                  : null,
              isoCurrencyCode:
                remote.balances.iso_currency_code ??
                remote.balances.unofficial_currency_code ??
                local.isoCurrencyCode,
              lastBalanceUpdate: now,
            },
          });
          updated += 1;
          perItemUpdated += 1;
        }

        // F7: audit per-item balance refresh (system-driven, so actor != user).
        if (perItemUpdated > 0) {
          await writeAccessLog({
            userId: item.userId,
            actorUserId: 'system:plaidRebalance',
            action: 'SYNC',
            resource: 'BankAccount',
            resourceId: item.id,
            context: { updated: perItemUpdated, jobName: 'plaidRebalance' },
          });
        }
      } catch (err) {
        logger.warn('plaidRebalance: failed for item — continuing', {
          plaidItemId: item.id,
          error: (err as Error).message,
        });
      }
    }
    logger.info('Job: plaidRebalance completed', { items: items.length, updated });
  } catch (err) {
    logger.error('Job: plaidRebalance failed', { error: (err as Error).message });
  }
}

// ── F6: TTL purge for old Plaid webhook payloads ──
//
// Scrubs the `rawPayload` JSON column on PlaidWebhookEvent rows older than
// 30 days. We keep the row (and its dedup key) so retries are still caught,
// but we drop the body bytes so old PII does not pile up indefinitely.
export async function purgeOldWebhookPayloads(): Promise<{ purgedCount: number }> {
  logger.info('Job: purgeOldWebhookPayloads started');
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  try {
    const result = await prisma.plaidWebhookEvent.updateMany({
      where: {
        receivedAt: { lt: cutoff },
        NOT: { rawPayload: { equals: Prisma.JsonNull } },
      },
      data: { rawPayload: Prisma.JsonNull, processingError: null },
    });
    logger.info('Purged old Plaid webhook payloads', { purgedCount: result.count, cutoff });
    return { purgedCount: result.count };
  } catch (err) {
    logger.error('Job: purgeOldWebhookPayloads failed', { error: (err as Error).message });
    return { purgedCount: 0 };
  }
}
