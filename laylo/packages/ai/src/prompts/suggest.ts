import { z } from 'zod';
import type { UserContext } from '@life-admin/shared';

export const systemPrompt = `You are a proactive life administration assistant for Life Admin AI.

Your task is to analyze the user's current tasks, bills, subscriptions, documents, appointments, and reminders, then suggest new tasks or reminders that would help them stay organized.

Instructions:
- Suggest tasks for things the user should do but hasn't created a task for (e.g., renew expiring documents, review upcoming bills, prepare for appointments).
- Suggest reminders for time-sensitive items that don't already have reminders set.
- Each suggestion must have a clear, actionable title and a brief reason explaining why it's being suggested.
- For task suggestions: include a reasonable due date (ISO 8601), priority level, and description.
- For reminder suggestions: include a suggested dateTime (ISO 8601) and the linked entity type if applicable.
- Return 3-8 suggestions, prioritizing the most impactful and time-sensitive ones.
- Do NOT suggest duplicates of existing tasks or reminders.
- Respond ONLY with valid JSON. Do not wrap in markdown code fences or add any text outside the JSON object.

Output format:
{"suggestions": [{"type": "task", "title": "...", "description": "...", "dueDate": "YYYY-MM-DD", "priority": "LOW|MEDIUM|HIGH|URGENT", "reason": "..."}, {"type": "reminder", "title": "...", "dateTime": "YYYY-MM-DDTHH:mm:ss", "linkedType": "TASK|BILL|SUBSCRIPTION|APPOINTMENT|DOCUMENT|NONE", "reason": "..."}]}`;

export function buildUserMessage(userContext: UserContext): string {
  const sections: string[] = [];

  sections.push(`Today's date: ${new Date().toISOString().split('T')[0]}`);
  sections.push(`User: ${userContext.name} (Plan: ${userContext.plan})`);

  if (userContext.tasks.length > 0) {
    const pending = userContext.tasks.filter((t) => t.status !== 'COMPLETED');
    sections.push(`\nExisting tasks (${pending.length} pending):`);
    pending.slice(0, 15).forEach((t) => {
      sections.push(`  - "${t.title}" (${t.priority}, ${t.status}${t.dueDate ? `, due: ${t.dueDate.toISOString().split('T')[0]}` : ''})`);
    });
  }

  if (userContext.bills.length > 0) {
    const active = userContext.bills.filter((b) => b.status === 'ACTIVE');
    sections.push(`\nActive bills (${active.length}):`);
    active.slice(0, 10).forEach((b) => {
      sections.push(`  - "${b.name}" ($${b.amount}, ${b.frequency}, next due: ${b.nextDueDate.toISOString().split('T')[0]})`);
    });
  }

  if (userContext.subscriptions.length > 0) {
    const active = userContext.subscriptions.filter((s) => s.status === 'ACTIVE');
    sections.push(`\nActive subscriptions (${active.length}):`);
    active.slice(0, 10).forEach((s) => {
      sections.push(`  - "${s.name}" ($${s.amount}, ${s.frequency}, renews: ${s.nextRenewalDate.toISOString().split('T')[0]})`);
    });
  }

  if (userContext.documents.length > 0) {
    sections.push(`\nDocuments (${userContext.documents.length}):`);
    userContext.documents.slice(0, 10).forEach((d) => {
      sections.push(`  - "${d.title}" (${d.category}${d.expirationDate ? `, expires: ${d.expirationDate.toISOString().split('T')[0]}` : ''})`);
    });
  }

  if (userContext.appointments.length > 0) {
    const upcoming = userContext.appointments.filter((a) => new Date(a.dateTime) >= new Date());
    sections.push(`\nUpcoming appointments (${upcoming.length}):`);
    upcoming.slice(0, 5).forEach((a) => {
      sections.push(`  - "${a.title}" (${a.dateTime.toISOString()}${a.location ? `, at: ${a.location}` : ''})`);
    });
  }

  if (userContext.reminders.length > 0) {
    const pending = userContext.reminders.filter((r) => r.status === 'PENDING');
    sections.push(`\nExisting reminders (${pending.length} pending):`);
    pending.slice(0, 10).forEach((r) => {
      sections.push(`  - "${r.title}" (${r.dateTime.toISOString()})`);
    });
  }

  sections.push('\nAnalyze this data and suggest helpful tasks and reminders. Respond with valid JSON only.');

  return `<user_input>\n${sections.join('\n')}\n</user_input>`;
}

export const outputSchema = z.object({
  suggestions: z.array(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('task'),
        title: z.string().min(1),
        description: z.string().min(1),
        dueDate: z.string(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
        reason: z.string().min(1),
      }),
      z.object({
        type: z.literal('reminder'),
        title: z.string().min(1),
        dateTime: z.string(),
        linkedType: z.enum(['TASK', 'BILL', 'SUBSCRIPTION', 'APPOINTMENT', 'DOCUMENT', 'NONE']),
        reason: z.string().min(1),
      }),
    ]),
  ),
});
