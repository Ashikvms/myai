import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../config/prisma';
import { notifyUser } from '../services/notifications';
import {
  billReminderTemplate,
  documentExpiryTemplate,
  reminderTemplate,
} from '../services/email-templates';

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

        const [tasks, bills, subscriptions, documents, appointments, reminders] =
          await Promise.all([
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
          ]);

        const context = {
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
