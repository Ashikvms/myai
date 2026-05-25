import { z } from 'zod';
import type { GmailMessageInput } from '../types';

/**
 * Bump this whenever the prompt or schema changes so the API layer can
 * re-extract older messages without us having to track every diff.
 */
export const extractionVersion = 1;

export const TOOL_NAME = 'record_bill';

export const systemPrompt = `You extract bill / receipt / invoice data from a single Gmail message for BillBee, a personal life-admin app.

Your only job is to call the record_bill tool with the right fields, or call it with confidence below 0.6 if the email is not a bill.

What counts as a bill:
- Invoices, receipts, payment confirmations, payment reminders, subscription renewals, utility statements, rent notices, insurance premium notices, medical bills.

What does NOT count as a bill (return confidence below 0.6):
- Marketing or promotional emails ("50% off!"), newsletters, shipping notifications without payment info, personal correspondence, calendar invites, OTP / security codes, account-creation confirmations with no charge.

Field rules:
- vendor: clean human-readable name. Strip "via Stripe", "noreply", "billing-team". Examples: "Netflix", "Pacific Gas & Electric", "Dr. Patel's Office".
- amount: numeric only, no currency symbol. Use the total charged (or to-be-charged), not subtotal.
- currency: ISO 4217 code (USD, EUR, GBP, INR, CAD, AUD, JPY, etc.). Infer from symbol if no code given.
- dueAt: ISO 8601 datetime (YYYY-MM-DDTHH:mm:ssZ). For "due in N days" / "due by Friday", resolve relative to the email's receivedAt timestamp the user provides. For receipts of already-paid charges, use the charge date. Null if no date can be determined.
- billingCycle: 'monthly' for monthly subscriptions / utilities, 'yearly' for annual renewals, 'one-time' for receipts of one-off purchases, 'unknown' if you cannot tell.
- category: pick exactly one — utilities, subscription, rent, insurance, medical, shopping, food-delivery, other.
- confidence: 0-1. Use 0.9+ for unambiguous bills with all fields. 0.7-0.89 if some fields inferred. Below 0.6 if it's not a bill or you cannot find an amount.

Be conservative. If the amount is missing or ambiguous, drop confidence below 0.6.`;

export function buildUserMessage(email: GmailMessageInput): string {
  // Truncate body to keep input tokens predictable; bills are top-loaded.
  const body = email.body.length > 6000 ? email.body.slice(0, 6000) + '\n…[truncated]' : email.body;

  return `<email>
From: ${email.fromAddress}
Subject: ${email.subject}
Received: ${email.receivedAt.toISOString()}

${body}
</email>

Call record_bill with the extracted fields. If this is not a bill, still call the tool but set confidence below 0.6.`;
}

export const toolDefinition = {
  name: TOOL_NAME,
  description:
    'Record a bill extracted from an email. Call with confidence < 0.6 if the email is not a bill.',
  input_schema: {
    type: 'object' as const,
    properties: {
      vendor: { type: 'string', description: 'Clean vendor / merchant name.' },
      amount: { type: 'number', description: 'Total amount, no currency symbol.' },
      currency: { type: 'string', description: 'ISO 4217 currency code, e.g. USD.' },
      dueAt: {
        type: ['string', 'null'],
        description:
          'ISO 8601 datetime for the due date or charge date. Null if unknown.',
      },
      billingCycle: {
        type: 'string',
        enum: ['one-time', 'monthly', 'yearly', 'unknown'],
      },
      category: {
        type: 'string',
        enum: [
          'utilities',
          'subscription',
          'rent',
          'insurance',
          'medical',
          'shopping',
          'food-delivery',
          'other',
        ],
      },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
    },
    required: [
      'vendor',
      'amount',
      'currency',
      'dueAt',
      'billingCycle',
      'category',
      'confidence',
    ],
  },
};

/**
 * Schema for the raw tool input. `dueAt` arrives as an ISO string or null;
 * the service layer converts it to a Date. Vendor / currency are normalised
 * defensively even though the prompt asks for clean values.
 */
export const outputSchema = z.object({
  vendor: z.string().min(1).transform((s) => s.trim()),
  amount: z.number().nonnegative(),
  currency: z.string().min(1).transform((s) => s.trim().toUpperCase()),
  dueAt: z.union([z.string().datetime({ offset: true }), z.string().date(), z.null()]),
  billingCycle: z.enum(['one-time', 'monthly', 'yearly', 'unknown']),
  category: z.enum([
    'utilities',
    'subscription',
    'rent',
    'insurance',
    'medical',
    'shopping',
    'food-delivery',
    'other',
  ]),
  confidence: z.number().min(0).max(1),
});
