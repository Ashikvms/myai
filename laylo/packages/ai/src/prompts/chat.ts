import type { UserContext } from '@life-admin/shared';

export const systemPrompt = `You are Life Admin AI, a practical personal life administration assistant.

Your role is to help users manage their tasks, bills, subscriptions, documents, appointments, and reminders. You have access to their actual data and should reference it when answering questions.

Guidelines:
- Be concise and practical. Get to the point quickly.
- Use markdown formatting for readability (lists, bold for emphasis, headers for sections).
- Clearly distinguish between:
  - **Information**: Facts from the user's data (state with certainty).
  - **Suggestions**: Recommendations you're making (use phrases like "I'd suggest" or "You might want to").
  - **Actions**: Things that require the user's confirmation before executing (explicitly ask for confirmation).
- NEVER fabricate data. If the user asks about something not in their data, say so.
- When referencing dates, use a human-friendly format (e.g., "March 15, 2026").
- If the user's question is ambiguous, ask for clarification rather than guessing.
- Keep responses focused on life administration topics.`;

export function buildUserMessage(question: string, userContext: UserContext): string {
  const contextSummary = buildContextSummary(userContext);

  return `Here is the user's current data:

${contextSummary}

<user_input>
${question}
</user_input>`;
}

function buildContextSummary(ctx: UserContext): string {
  const sections: string[] = [];

  sections.push(`User: ${ctx.name} (Plan: ${ctx.plan})`);

  if (ctx.tasks.length > 0) {
    const pending = ctx.tasks.filter((t) => t.status !== 'COMPLETED');
    const completed = ctx.tasks.filter((t) => t.status === 'COMPLETED');
    sections.push(`Tasks: ${pending.length} pending, ${completed.length} completed`);
    if (pending.length > 0) {
      const taskList = pending
        .slice(0, 10)
        .map((t) => `  - "${t.title}" (${t.priority}, ${t.status}${t.dueDate ? `, due: ${t.dueDate.toISOString().split('T')[0]}` : ''})`)
        .join('\n');
      sections.push(taskList);
      if (pending.length > 10) {
        sections.push(`  ... and ${pending.length - 10} more`);
      }
    }
  } else {
    sections.push('Tasks: none');
  }

  if (ctx.bills.length > 0) {
    const activeBills = ctx.bills.filter((b) => b.status === 'ACTIVE');
    sections.push(`Bills: ${activeBills.length} active out of ${ctx.bills.length} total`);
    if (activeBills.length > 0) {
      const billList = activeBills
        .slice(0, 10)
        .map((b) => `  - "${b.name}" ($${b.amount}, ${b.frequency}, next due: ${b.nextDueDate.toISOString().split('T')[0]})`)
        .join('\n');
      sections.push(billList);
    }
  } else {
    sections.push('Bills: none');
  }

  if (ctx.subscriptions.length > 0) {
    const activeSubs = ctx.subscriptions.filter((s) => s.status === 'ACTIVE');
    sections.push(`Subscriptions: ${activeSubs.length} active out of ${ctx.subscriptions.length} total`);
    if (activeSubs.length > 0) {
      const subList = activeSubs
        .slice(0, 10)
        .map((s) => `  - "${s.name}" ($${s.amount}, ${s.frequency}, renews: ${s.nextRenewalDate.toISOString().split('T')[0]})`)
        .join('\n');
      sections.push(subList);
    }
  } else {
    sections.push('Subscriptions: none');
  }

  if (ctx.documents.length > 0) {
    sections.push(`Documents: ${ctx.documents.length} total`);
    const docList = ctx.documents
      .slice(0, 10)
      .map((d) => `  - "${d.title}" (${d.category}${d.expirationDate ? `, expires: ${d.expirationDate.toISOString().split('T')[0]}` : ''})`)
      .join('\n');
    sections.push(docList);
  } else {
    sections.push('Documents: none');
  }

  if (ctx.appointments.length > 0) {
    const upcoming = ctx.appointments.filter((a) => new Date(a.dateTime) >= new Date());
    sections.push(`Appointments: ${upcoming.length} upcoming out of ${ctx.appointments.length} total`);
    if (upcoming.length > 0) {
      const apptList = upcoming
        .slice(0, 5)
        .map((a) => `  - "${a.title}" (${a.dateTime.toISOString()}${a.location ? `, at: ${a.location}` : ''})`)
        .join('\n');
      sections.push(apptList);
    }
  } else {
    sections.push('Appointments: none');
  }

  if (ctx.reminders.length > 0) {
    const pending = ctx.reminders.filter((r) => r.status === 'PENDING');
    sections.push(`Reminders: ${pending.length} pending out of ${ctx.reminders.length} total`);
    if (pending.length > 0) {
      const reminderList = pending
        .slice(0, 5)
        .map((r) => `  - "${r.title}" (${r.dateTime.toISOString()})`)
        .join('\n');
      sections.push(reminderList);
    }
  } else {
    sections.push('Reminders: none');
  }

  return sections.join('\n');
}
