import { z } from 'zod';
import type { UserContext } from '@life-admin/shared';

export const systemPrompt = `You are a dashboard insights generator for Life Admin AI.

Your task is to analyze the user's life administration data and generate actionable insights for their dashboard. These insights should help the user stay on top of their responsibilities and spot potential issues.

Insight types:
- SPENDING: Observations about bills, subscriptions, or spending patterns.
- RENEWAL: Upcoming renewals for subscriptions or recurring services.
- EXPIRY: Documents, warranties, or items approaching expiration.
- TASK: Observations about task management (overdue tasks, workload, priorities).
- GENERAL: Cross-cutting observations that don't fit other categories.

Instructions:
- Generate 3-6 insights, prioritizing the most urgent and actionable ones.
- Each insight should have a clear, human-readable message (1-2 sentences).
- Mark insights as actionable (true) if the user should take a specific action, or non-actionable (false) if it's purely informational.
- Base insights ONLY on the data provided. Never fabricate or assume data.
- Focus on time-sensitive items: overdue tasks, upcoming bills, expiring documents, etc.
- Respond ONLY with valid JSON. Do not wrap in markdown code fences or add any text outside the JSON object.

Output format:
{"insights": [{"type": "SPENDING|RENEWAL|EXPIRY|TASK|GENERAL", "message": "...", "actionable": true|false}]}`;

export function buildUserMessage(userContext: UserContext): string {
  const sections: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  sections.push(`Today's date: ${today}`);
  sections.push(`User: ${userContext.name} (Plan: ${userContext.plan})`);

  if (userContext.tasks.length > 0) {
    const pending = userContext.tasks.filter((t) => t.status !== 'COMPLETED');
    const now = new Date();
    const overdue = pending.filter((t) => t.dueDate && t.dueDate < now);
    sections.push(`\nTasks: ${pending.length} pending, ${overdue.length} overdue`);
    if (overdue.length > 0) {
      sections.push('Overdue tasks:');
      overdue.slice(0, 5).forEach((t) => {
        sections.push(`  - "${t.title}" (due: ${t.dueDate!.toISOString().split('T')[0]}, ${t.priority})`);
      });
    }
    const urgent = pending.filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH');
    if (urgent.length > 0) {
      sections.push(`High/Urgent priority tasks: ${urgent.length}`);
    }
  }

  if (userContext.bills.length > 0) {
    const active = userContext.bills.filter((b) => b.status === 'ACTIVE');
    const totalMonthly = active.reduce((sum, b) => {
      const multiplier =
        b.frequency === 'WEEKLY' ? 4.33 :
        b.frequency === 'BIWEEKLY' ? 2.17 :
        b.frequency === 'MONTHLY' ? 1 :
        b.frequency === 'QUARTERLY' ? 1 / 3 :
        b.frequency === 'ANNUALLY' ? 1 / 12 : 1;
      return sum + b.amount * multiplier;
    }, 0);
    sections.push(`\nBills: ${active.length} active, ~$${totalMonthly.toFixed(2)}/month estimated`);
    const dueSoon = active.filter((b) => {
      const dueDate = new Date(b.nextDueDate);
      const diff = (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    });
    if (dueSoon.length > 0) {
      sections.push('Bills due within 7 days:');
      dueSoon.forEach((b) => {
        sections.push(`  - "${b.name}" ($${b.amount}, due: ${b.nextDueDate.toISOString().split('T')[0]})`);
      });
    }
  }

  if (userContext.subscriptions.length > 0) {
    const active = userContext.subscriptions.filter((s) => s.status === 'ACTIVE');
    const totalMonthly = active.reduce((sum, s) => {
      const multiplier =
        s.frequency === 'WEEKLY' ? 4.33 :
        s.frequency === 'BIWEEKLY' ? 2.17 :
        s.frequency === 'MONTHLY' ? 1 :
        s.frequency === 'QUARTERLY' ? 1 / 3 :
        s.frequency === 'ANNUALLY' ? 1 / 12 : 1;
      return sum + s.amount * multiplier;
    }, 0);
    sections.push(`\nSubscriptions: ${active.length} active, ~$${totalMonthly.toFixed(2)}/month estimated`);
    const renewingSoon = active.filter((s) => {
      const diff = (s.nextRenewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 14;
    });
    if (renewingSoon.length > 0) {
      sections.push('Subscriptions renewing within 14 days:');
      renewingSoon.forEach((s) => {
        sections.push(`  - "${s.name}" ($${s.amount}, renews: ${s.nextRenewalDate.toISOString().split('T')[0]})`);
      });
    }
  }

  if (userContext.documents.length > 0) {
    const expiringSoon = userContext.documents.filter((d) => {
      if (!d.expirationDate) return false;
      const diff = (d.expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 30;
    });
    const expired = userContext.documents.filter((d) => {
      if (!d.expirationDate) return false;
      return d.expirationDate < new Date();
    });
    sections.push(`\nDocuments: ${userContext.documents.length} total, ${expired.length} expired, ${expiringSoon.length} expiring within 30 days`);
    if (expiringSoon.length > 0) {
      sections.push('Expiring soon:');
      expiringSoon.forEach((d) => {
        sections.push(`  - "${d.title}" (${d.category}, expires: ${d.expirationDate!.toISOString().split('T')[0]})`);
      });
    }
  }

  if (userContext.appointments.length > 0) {
    const upcoming = userContext.appointments.filter((a) => new Date(a.dateTime) >= new Date());
    sections.push(`\nAppointments: ${upcoming.length} upcoming`);
    upcoming.slice(0, 5).forEach((a) => {
      sections.push(`  - "${a.title}" (${a.dateTime.toISOString()})`);
    });
  }

  if (userContext.reminders.length > 0) {
    const pending = userContext.reminders.filter((r) => r.status === 'PENDING');
    sections.push(`\nReminders: ${pending.length} pending`);
  }

  sections.push('\nGenerate dashboard insights based on this data. Respond with valid JSON only.');

  return `<user_input>\n${sections.join('\n')}\n</user_input>`;
}

export const outputSchema = z.object({
  insights: z.array(
    z.object({
      type: z.enum(['SPENDING', 'RENEWAL', 'EXPIRY', 'TASK', 'GENERAL']),
      message: z.string().min(1),
      actionable: z.boolean(),
    }),
  ),
});
