import { z } from 'zod';
import type { GmailMessageInput } from '../types';

export const extractionVersion = 1;

export const TOOL_NAME = 'record_appointment';

export const systemPrompt = `You extract appointment / booking / reservation data from a single Gmail message for BillBee, a personal life-admin app.

Your only job is to call the record_appointment tool with the right fields, or call it with confidence below 0.6 if the email is not an appointment.

What counts as an appointment:
- Flight / train / bus / Uber bookings, hotel reservations, restaurant reservations, doctor / dental / salon visits, event tickets (concerts, conferences, classes), virtual meetings (Zoom / Meet / Teams invites), in-person meetings.

What does NOT count (return confidence below 0.6):
- Bills / invoices, marketing, newsletters, shipping notifications, OTP codes, "we missed you" emails, calendar reminders for already-saved events.

Field rules:
- title: short, scannable name. Examples: "Flight to SFO (UA 1421)", "Dinner at Tartine", "Dr. Patel — annual checkup", "Quarterly review w/ Sarah".
- startAt: ISO 8601 datetime with timezone offset (e.g. "2026-06-12T14:30:00-07:00"). If the email shows a timezone, use it. If ambiguous, use UTC (Z). Resolve relative phrasing ("tomorrow at 3pm") against the email's receivedAt timestamp.
- endAt: ISO 8601 datetime if explicitly given. Otherwise null (do not invent durations).
- location: physical address for in-person, OR full meeting URL for virtual. Null if not specified.
- virtual: true when the location is a Zoom / Google Meet / Microsoft Teams / Webex / similar URL. false for physical addresses.
- attendees: email addresses found in the message (To / Cc / "with X (x@y.com)"). Exclude the recipient if you can tell. Empty array if none.
- notes: 1-2 sentence summary of anything useful not captured above (confirmation number, dress code, parking info). Null if nothing extra.
- confidence: 0.9+ for clear bookings with date + time. 0.7-0.89 if details are inferred. Below 0.6 if it is not an appointment or you cannot extract a start time.

Be conservative. No start time → confidence below 0.6.`;

export function buildUserMessage(email: GmailMessageInput): string {
  const body = email.body.length > 6000 ? email.body.slice(0, 6000) + '\n…[truncated]' : email.body;

  return `<email>
From: ${email.fromAddress}
Subject: ${email.subject}
Received: ${email.receivedAt.toISOString()}

${body}
</email>

Call record_appointment with the extracted fields. If this is not an appointment, still call the tool but set confidence below 0.6.`;
}

export const toolDefinition = {
  name: TOOL_NAME,
  description:
    'Record an appointment / booking extracted from an email. Call with confidence < 0.6 if the email is not an appointment.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string' },
      startAt: { type: 'string', description: 'ISO 8601 datetime with timezone offset.' },
      endAt: { type: ['string', 'null'] },
      location: { type: ['string', 'null'] },
      virtual: { type: 'boolean' },
      attendees: { type: 'array', items: { type: 'string' } },
      notes: { type: ['string', 'null'] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
    },
    required: [
      'title',
      'startAt',
      'endAt',
      'location',
      'virtual',
      'attendees',
      'notes',
      'confidence',
    ],
  },
};

export const outputSchema = z.object({
  title: z.string().min(1).transform((s) => s.trim()),
  startAt: z.union([z.string().datetime({ offset: true }), z.string().date()]),
  endAt: z.union([z.string().datetime({ offset: true }), z.string().date(), z.null()]),
  location: z.union([z.string().min(1), z.null()]),
  virtual: z.boolean(),
  attendees: z.array(z.string().email().or(z.string().min(1))),
  notes: z.union([z.string().min(1), z.null()]),
  confidence: z.number().min(0).max(1),
});
