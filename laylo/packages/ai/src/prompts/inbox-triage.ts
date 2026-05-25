import { z } from 'zod';
import type { GmailMessageInput } from '../types';

export const extractionVersion = 1;

export const TOOL_NAME = 'record_triage';

export const systemPrompt = `You triage a batch of Gmail messages for BillBee, a personal life-admin app. The user opens their dashboard and sees the output of this triage at the top.

Bucket every message into exactly one of:

1. mustAct — needs a response or specific action TODAY. Examples: bills due in the next 3 days, doctor / flight confirmations to acknowledge, work emails asking a direct question, password resets initiated by the user, calendar invites requesting RSVP. Hard cap: 5 items. If more than 5 qualify, keep the 5 most time-sensitive.

2. fyi — read-only updates worth knowing. Examples: order shipped, payment received, account statement available, news from a personal contact that doesn't need a reply, project status updates. Hard cap: 8 items.

3. noise — return only the COUNT, not the items. Includes: marketing, newsletters, promotional offers, "we miss you", auto-generated alerts the user already acted on, social-network digests.

Field rules:
- mustAct[].why: one short sentence (<= 15 words) on why it is urgent.
- mustAct[].suggestedAction: one short imperative verb phrase (<= 8 words). Examples: "Pay $89 before Friday", "Confirm 3pm Tuesday slot", "Reply with availability".
- fyi[].summary: one sentence (<= 20 words). Pure summary, no action verbs.
- headline: ONE sentence for the dashboard hero. Format: "<count> things worth your attention today: <list>". Examples:
  - "3 things worth your attention today: 2 bills due, 1 doctor confirmation"
  - "Inbox is quiet — just 4 receipts and a newsletter digest."
  - "1 thing needs you today: rent due tomorrow."
- Subjects and fromAddress: copy them verbatim from the input. Do not invent or rewrite.

Be terse. Users read this between meetings. No fluff, no preamble, no emoji.`;

export function buildUserMessage(emails: GmailMessageInput[]): string {
  // Each email gets a compact, numbered block. Body trimmed hard — triage
  // can be made from subject + first 800 chars in nearly all cases.
  const blocks = emails.map((email, i) => {
    const body = email.body.length > 800 ? email.body.slice(0, 800) + '…' : email.body;
    return `[${i + 1}]
From: ${email.fromAddress}
Subject: ${email.subject}
Received: ${email.receivedAt.toISOString()}
Body: ${body.replace(/\n+/g, ' ').trim()}`;
  });

  return `<emails count="${emails.length}">
${blocks.join('\n\n---\n\n')}
</emails>

Call record_triage with mustAct (max 5), fyi (max 8), and a noise count, plus a one-sentence headline.`;
}

export const toolDefinition = {
  name: TOOL_NAME,
  description:
    'Record the triage of a batch of Gmail messages into mustAct / fyi / noise buckets with a one-sentence headline.',
  input_schema: {
    type: 'object' as const,
    properties: {
      headline: { type: 'string' },
      mustAct: {
        type: 'array',
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            fromAddress: { type: 'string' },
            why: { type: 'string' },
            suggestedAction: { type: 'string' },
          },
          required: ['subject', 'fromAddress', 'why', 'suggestedAction'],
        },
      },
      fyi: {
        type: 'array',
        maxItems: 8,
        items: {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            fromAddress: { type: 'string' },
            summary: { type: 'string' },
          },
          required: ['subject', 'fromAddress', 'summary'],
        },
      },
      noise: { type: 'integer', minimum: 0 },
    },
    required: ['headline', 'mustAct', 'fyi', 'noise'],
  },
};

export const outputSchema = z.object({
  headline: z.string().min(1),
  mustAct: z
    .array(
      z.object({
        subject: z.string().min(1),
        fromAddress: z.string().min(1),
        why: z.string().min(1),
        suggestedAction: z.string().min(1),
      }),
    )
    .max(5),
  fyi: z
    .array(
      z.object({
        subject: z.string().min(1),
        fromAddress: z.string().min(1),
        summary: z.string().min(1),
      }),
    )
    .max(8),
  noise: z.number().int().nonnegative(),
});
