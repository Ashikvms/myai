import { z } from 'zod';
import type { UserContext } from '@life-admin/shared';

export const systemPrompt = `You are a natural language interpreter for Life Admin AI.

Your task is to convert the user's natural language input into a structured action that the system can execute. You must determine the intended action, extract the relevant payload fields, and assess your confidence in the interpretation.

Supported actions:
- CREATE_TASK: Create a new task. Payload: { title, description?, dueDate?, priority? }
- CREATE_REMINDER: Create a reminder. Payload: { title, dateTime, linkedType?, linkedId? }
- CREATE_BILL: Add a bill. Payload: { name, amount, frequency, nextDueDate, category? }
- CREATE_SUBSCRIPTION: Add a subscription. Payload: { name, amount, frequency, nextBillingDate, category? }
- CREATE_APPOINTMENT: Create an appointment. Payload: { title, dateTime, location?, notes? }
- UPDATE_TASK: Update an existing task. Payload: { taskId, updates: { title?, status?, priority?, dueDate? } }
- DELETE_TASK: Delete a task. Payload: { taskId }

Instructions:
- Parse the user's natural language and map it to exactly one action.
- Fill in the payload with as much detail as can be extracted from the input.
- For dates, use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss).
- For UPDATE_TASK and DELETE_TASK, try to match the task by title from the user's existing tasks.
- Confidence scale (0 to 1):
  - 0.9-1.0: Clear, unambiguous intent with all required fields present.
  - 0.7-0.89: Likely correct but some fields are inferred or ambiguous.
  - Below 0.7: Too ambiguous to act on safely.
- Respond ONLY with valid JSON. Do not wrap in markdown code fences or add any text outside the JSON object.

Output format:
{"action": "ACTION_TYPE", "payload": {...}, "confidence": 0.0}`;

export function buildUserMessage(text: string, userContext: UserContext): string {
  const sections: string[] = [];

  sections.push(`Today's date: ${new Date().toISOString().split('T')[0]}`);
  sections.push(`User: ${userContext.name}`);

  if (userContext.tasks.length > 0) {
    const pending = userContext.tasks.filter((t) => t.status !== 'COMPLETED');
    if (pending.length > 0) {
      sections.push(`\nExisting tasks:`);
      pending.slice(0, 10).forEach((t) => {
        sections.push(`  - [${t.id}] "${t.title}" (${t.priority}, ${t.status})`);
      });
    }
  }

  sections.push(`\nUser's request: "${text}"`);
  sections.push('\nConvert this to a structured action. Respond with valid JSON only.');

  return `<user_input>\n${sections.join('\n')}\n</user_input>`;
}

export const outputSchema = z.object({
  action: z.enum([
    'CREATE_TASK',
    'CREATE_REMINDER',
    'CREATE_BILL',
    'CREATE_SUBSCRIPTION',
    'CREATE_APPOINTMENT',
    'UPDATE_TASK',
    'DELETE_TASK',
  ]),
  payload: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
});
