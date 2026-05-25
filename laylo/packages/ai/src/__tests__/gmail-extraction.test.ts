import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AiService } from '../service';
import type { GmailMessageInput } from '../types';

// ── Mock the ClaudeClient so we can capture tool params + control returns ──

let mockCallClaudeTool: ReturnType<typeof vi.fn>;
let mockCallClaude: ReturnType<typeof vi.fn>;

vi.mock('../client', () => ({
  createClaudeClient: () => ({
    callClaude: (...args: unknown[]) => mockCallClaude(...args),
    streamClaude: vi.fn(),
    callClaudeTool: (...args: unknown[]) => mockCallClaudeTool(...args),
  }),
}));

const { createAiService } = await import('../service');

// ── Helpers ───────────────────────────────────────────────────────────

function makeService(): AiService {
  return createAiService('sk-test-key', 'claude-sonnet-4-20250514');
}

function makeEmail(overrides: Partial<GmailMessageInput> = {}): GmailMessageInput {
  return {
    subject: 'Your invoice from Acme',
    fromAddress: 'billing@acme.com',
    body: 'Your bill is $42.00 USD, due 2026-06-01.',
    receivedAt: new Date('2026-05-25T12:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  mockCallClaude = vi.fn();
  mockCallClaudeTool = vi.fn();
});

// ── extractBillFromEmail ─────────────────────────────────────────────

describe('extractBillFromEmail', () => {
  it('returns a parsed ExtractedBill on a high-confidence tool response', async () => {
    mockCallClaudeTool.mockResolvedValueOnce({
      vendor: 'Acme Corp',
      amount: 42,
      currency: 'USD',
      dueAt: '2026-06-01T00:00:00Z',
      billingCycle: 'monthly',
      category: 'subscription',
      confidence: 0.95,
    });

    const result = await makeService().extractBillFromEmail(makeEmail());

    expect(result).not.toBeNull();
    expect(result!.vendor).toBe('Acme Corp');
    expect(result!.amount).toBe(42);
    expect(result!.currency).toBe('USD');
    expect(result!.dueAt).toBeInstanceOf(Date);
    expect(result!.dueAt!.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(result!.billingCycle).toBe('monthly');
    expect(result!.category).toBe('subscription');
    expect(result!.confidence).toBe(0.95);
  });

  it('forwards the correct tool name and required fields to the client', async () => {
    mockCallClaudeTool.mockResolvedValueOnce({
      vendor: 'Acme',
      amount: 10,
      currency: 'USD',
      dueAt: null,
      billingCycle: 'one-time',
      category: 'shopping',
      confidence: 0.9,
    });

    await makeService().extractBillFromEmail(makeEmail());

    expect(mockCallClaudeTool).toHaveBeenCalledOnce();
    const params = mockCallClaudeTool.mock.calls[0]![0];
    expect(params.tool.name).toBe('record_bill');
    expect(params.tool.input_schema.required).toContain('amount');
    expect(params.tool.input_schema.required).toContain('confidence');
    expect(typeof params.system).toBe('string');
    expect(params.userMessage).toContain('billing@acme.com');
  });

  it('returns null when confidence is below 0.6', async () => {
    mockCallClaudeTool.mockResolvedValueOnce({
      vendor: 'Newsletter',
      amount: 0,
      currency: 'USD',
      dueAt: null,
      billingCycle: 'unknown',
      category: 'other',
      confidence: 0.2,
    });

    const result = await makeService().extractBillFromEmail(makeEmail());
    expect(result).toBeNull();
  });

  it('returns null when dueAt is null in the response', async () => {
    mockCallClaudeTool.mockResolvedValueOnce({
      vendor: 'Acme',
      amount: 10,
      currency: 'USD',
      dueAt: null,
      billingCycle: 'one-time',
      category: 'shopping',
      confidence: 0.9,
    });

    const result = await makeService().extractBillFromEmail(makeEmail());
    expect(result).not.toBeNull();
    expect(result!.dueAt).toBeNull();
  });

  it('returns null when the API call throws', async () => {
    mockCallClaudeTool.mockRejectedValueOnce(new Error('Internal Server Error'));

    const result = await makeService().extractBillFromEmail(makeEmail());
    expect(result).toBeNull();
  });

  it('returns null when the tool response fails schema validation', async () => {
    mockCallClaudeTool.mockResolvedValueOnce({
      // Missing amount/currency/etc.
      vendor: 'Acme',
      confidence: 0.9,
    });

    const result = await makeService().extractBillFromEmail(makeEmail());
    expect(result).toBeNull();
  });

  it('normalises currency to uppercase', async () => {
    mockCallClaudeTool.mockResolvedValueOnce({
      vendor: 'Acme',
      amount: 10,
      currency: 'usd',
      dueAt: null,
      billingCycle: 'one-time',
      category: 'shopping',
      confidence: 0.9,
    });

    const result = await makeService().extractBillFromEmail(makeEmail());
    expect(result!.currency).toBe('USD');
  });
});

// ── extractAppointmentFromEmail ──────────────────────────────────────

describe('extractAppointmentFromEmail', () => {
  it('returns a parsed ExtractedAppointment on a high-confidence response', async () => {
    mockCallClaudeTool.mockResolvedValueOnce({
      title: 'Dr. Patel — checkup',
      startAt: '2026-06-12T14:30:00-07:00',
      endAt: '2026-06-12T15:00:00-07:00',
      location: '123 Main St',
      virtual: false,
      attendees: [],
      notes: 'Bring insurance card.',
      confidence: 0.92,
    });

    const result = await makeService().extractAppointmentFromEmail(makeEmail());

    expect(result).not.toBeNull();
    expect(result!.title).toBe('Dr. Patel — checkup');
    expect(result!.startAt).toBeInstanceOf(Date);
    expect(result!.endAt).toBeInstanceOf(Date);
    expect(result!.virtual).toBe(false);
    expect(result!.location).toBe('123 Main St');
    expect(result!.notes).toBe('Bring insurance card.');
  });

  it('handles virtual meetings with a URL as location', async () => {
    mockCallClaudeTool.mockResolvedValueOnce({
      title: 'Sync w/ Sarah',
      startAt: '2026-06-12T14:30:00Z',
      endAt: null,
      location: 'https://zoom.us/j/1234567890',
      virtual: true,
      attendees: ['sarah@example.com'],
      notes: null,
      confidence: 0.88,
    });

    const result = await makeService().extractAppointmentFromEmail(makeEmail());
    expect(result!.virtual).toBe(true);
    expect(result!.location).toContain('zoom.us');
    expect(result!.endAt).toBeNull();
    expect(result!.attendees).toEqual(['sarah@example.com']);
  });

  it('forwards the correct tool name', async () => {
    mockCallClaudeTool.mockResolvedValueOnce({
      title: 'X',
      startAt: '2026-06-12T14:30:00Z',
      endAt: null,
      location: null,
      virtual: false,
      attendees: [],
      notes: null,
      confidence: 0.9,
    });

    await makeService().extractAppointmentFromEmail(makeEmail());
    const params = mockCallClaudeTool.mock.calls[0]![0];
    expect(params.tool.name).toBe('record_appointment');
  });

  it('returns null when confidence is below 0.6', async () => {
    mockCallClaudeTool.mockResolvedValueOnce({
      title: 'Maybe a meeting?',
      startAt: '2026-06-12T14:30:00Z',
      endAt: null,
      location: null,
      virtual: false,
      attendees: [],
      notes: null,
      confidence: 0.3,
    });

    const result = await makeService().extractAppointmentFromEmail(makeEmail());
    expect(result).toBeNull();
  });

  it('returns null when the API throws', async () => {
    mockCallClaudeTool.mockRejectedValueOnce(new Error('Timeout'));
    const result = await makeService().extractAppointmentFromEmail(makeEmail());
    expect(result).toBeNull();
  });

  it('returns null when startAt is malformed', async () => {
    mockCallClaudeTool.mockResolvedValueOnce({
      title: 'X',
      startAt: 'not-a-date',
      endAt: null,
      location: null,
      virtual: false,
      attendees: [],
      notes: null,
      confidence: 0.9,
    });

    const result = await makeService().extractAppointmentFromEmail(makeEmail());
    expect(result).toBeNull();
  });
});

// ── summarizeInboxTriage ─────────────────────────────────────────────

describe('summarizeInboxTriage', () => {
  it('returns the parsed triage summary on a happy path', async () => {
    mockCallClaudeTool.mockResolvedValueOnce({
      headline: '3 things worth your attention today: 2 bills, 1 doctor confirmation.',
      mustAct: [
        {
          subject: 'Invoice due Friday',
          fromAddress: 'billing@acme.com',
          why: 'Bill of $89 is due in 2 days.',
          suggestedAction: 'Pay $89 before Friday',
        },
      ],
      fyi: [
        {
          subject: 'Order shipped',
          fromAddress: 'ship@amazon.com',
          summary: 'Your headphones order shipped, arriving Thursday.',
        },
      ],
      noise: 7,
    });

    const result = await makeService().summarizeInboxTriage([makeEmail()]);

    expect(result.headline).toContain('3 things');
    expect(result.mustAct).toHaveLength(1);
    expect(result.mustAct[0]!.suggestedAction).toBe('Pay $89 before Friday');
    expect(result.fyi).toHaveLength(1);
    expect(result.noise).toBe(7);
  });

  it('forwards the correct tool name and includes all email metadata', async () => {
    mockCallClaudeTool.mockResolvedValueOnce({
      headline: 'Quiet.',
      mustAct: [],
      fyi: [],
      noise: 0,
    });

    await makeService().summarizeInboxTriage([
      makeEmail({ subject: 'Email A' }),
      makeEmail({ subject: 'Email B' }),
    ]);

    const params = mockCallClaudeTool.mock.calls[0]![0];
    expect(params.tool.name).toBe('record_triage');
    expect(params.userMessage).toContain('Email A');
    expect(params.userMessage).toContain('Email B');
    expect(params.userMessage).toContain('count="2"');
  });

  it('returns the quiet-inbox stub when given an empty list (no API call)', async () => {
    const result = await makeService().summarizeInboxTriage([]);

    expect(mockCallClaudeTool).not.toHaveBeenCalled();
    expect(result).toEqual({
      headline: 'Inbox is quiet today.',
      mustAct: [],
      fyi: [],
      noise: 0,
    });
  });

  it('returns the quiet-inbox stub on API error', async () => {
    mockCallClaudeTool.mockRejectedValueOnce(new Error('Boom'));

    const result = await makeService().summarizeInboxTriage([makeEmail()]);
    expect(result.headline).toBe('Inbox is quiet today.');
    expect(result.mustAct).toEqual([]);
    expect(result.fyi).toEqual([]);
    expect(result.noise).toBe(0);
  });

  it('returns the quiet-inbox stub when the response violates the schema (e.g. too many mustAct items)', async () => {
    mockCallClaudeTool.mockResolvedValueOnce({
      headline: 'Six things',
      mustAct: Array.from({ length: 6 }, (_, i) => ({
        subject: `S${i}`,
        fromAddress: 'x@y.com',
        why: 'why',
        suggestedAction: 'do it',
      })),
      fyi: [],
      noise: 0,
    });

    const result = await makeService().summarizeInboxTriage([makeEmail()]);
    expect(result.headline).toBe('Inbox is quiet today.');
  });
});

// ── extractionVersion constants ──────────────────────────────────────

describe('extractionVersion constants', () => {
  it('is exported and numeric for each Gmail prompt module', async () => {
    const billMod = await import('../prompts/extract-bill-from-email');
    const apptMod = await import('../prompts/extract-appointment-from-email');
    const triageMod = await import('../prompts/inbox-triage');

    expect(typeof billMod.extractionVersion).toBe('number');
    expect(typeof apptMod.extractionVersion).toBe('number');
    expect(typeof triageMod.extractionVersion).toBe('number');
    expect(billMod.extractionVersion).toBeGreaterThanOrEqual(1);
    expect(apptMod.extractionVersion).toBeGreaterThanOrEqual(1);
    expect(triageMod.extractionVersion).toBeGreaterThanOrEqual(1);
  });
});
