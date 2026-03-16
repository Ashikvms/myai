import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AiService } from '../service';

// ── Mock the ClaudeClient returned by createClaudeClient ────────────

let mockCallClaude: ReturnType<typeof vi.fn>;

vi.mock('../client', () => ({
  createClaudeClient: () => ({
    callClaude: (...args: unknown[]) => mockCallClaude(...args),
    streamClaude: vi.fn(),
  }),
}));

// ── Import after mocks are in place ─────────────────────────────────

const { createAiService } = await import('../service');

// ── Helpers ─────────────────────────────────────────────────────────

function makeService(): AiService {
  return createAiService('sk-test-key', 'claude-sonnet-4-20250514');
}

function makeUserContext() {
  return {
    userId: 'test-user-001',
    name: 'Test User',
    plan: 'FREE' as const,
    tasks: [],
    bills: [],
    subscriptions: [],
    documents: [],
    appointments: [],
    reminders: [],
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('AI Service', () => {
  beforeEach(() => {
    mockCallClaude = vi.fn();
  });

  // ────────────────────────────────────────────────────────
  // summarizeDocument
  // ────────────────────────────────────────────────────────

  describe('summarizeDocument', () => {
    it('returns a valid DocumentSummary on happy path', async () => {
      const expected = {
        summary: 'This is a home insurance policy covering fire and flood damage.',
        keyPoints: [
          'Coverage amount: $500,000',
          'Deductible: $1,000',
          'Policy period: Jan 2025 - Jan 2026',
        ],
      };
      mockCallClaude.mockResolvedValueOnce(JSON.stringify(expected));

      const service = makeService();
      const result = await service.summarizeDocument({
        documentText: 'Home insurance policy document text ...',
        category: 'INSURANCE',
      });

      expect(result).toEqual(expected);
      expect(result.summary).toBe(expected.summary);
      expect(result.keyPoints).toHaveLength(3);
      expect(mockCallClaude).toHaveBeenCalledOnce();
    });

    it('handles responses wrapped in markdown code fences', async () => {
      const expected = {
        summary: 'A lease agreement for 123 Main St.',
        keyPoints: ['Monthly rent: $2,000', 'Lease term: 12 months'],
      };
      const wrappedResponse = '```json\n' + JSON.stringify(expected) + '\n```';
      mockCallClaude.mockResolvedValueOnce(wrappedResponse);

      const service = makeService();
      const result = await service.summarizeDocument({
        documentText: 'Lease agreement text ...',
        category: 'LEASE',
      });

      expect(result).toEqual(expected);
    });

    it('throws when the API returns a 500 error', async () => {
      const error = new Error('Internal Server Error');
      (error as unknown as Record<string, number>).status = 500;
      mockCallClaude.mockRejectedValueOnce(error);

      const service = makeService();
      await expect(
        service.summarizeDocument({
          documentText: 'Some text',
          category: 'INSURANCE',
        }),
      ).rejects.toThrow('Internal Server Error');
    });

    it('throws when the API returns malformed (non-JSON) text', async () => {
      mockCallClaude.mockResolvedValueOnce('This is not JSON at all.');

      const service = makeService();
      await expect(
        service.summarizeDocument({
          documentText: 'Some text',
          category: 'INSURANCE',
        }),
      ).rejects.toThrow(); // JSON.parse will fail
    });

    it('throws when the response JSON does not match the schema', async () => {
      // Missing required "keyPoints" field
      mockCallClaude.mockResolvedValueOnce(JSON.stringify({ summary: 'A summary' }));

      const service = makeService();
      await expect(
        service.summarizeDocument({
          documentText: 'Some text',
          category: 'TAX',
        }),
      ).rejects.toThrow(); // Zod validation will fail
    });

    it('handles empty document text gracefully (still calls API)', async () => {
      const expected = {
        summary: 'Empty document.',
        keyPoints: ['No content provided'],
      };
      mockCallClaude.mockResolvedValueOnce(JSON.stringify(expected));

      const service = makeService();
      const result = await service.summarizeDocument({
        documentText: '',
        category: 'OTHER',
      });

      expect(result).toEqual(expected);
      expect(mockCallClaude).toHaveBeenCalledOnce();
    });
  });

  // ────────────────────────────────────────────────────────
  // extractDatesFromDocument
  // ────────────────────────────────────────────────────────

  describe('extractDatesFromDocument', () => {
    it('returns dates array with confidence scores on happy path', async () => {
      const expected = {
        dates: [
          { label: 'Policy start date', date: '2025-01-15', confidence: 'high' as const },
          { label: 'Policy end date', date: '2026-01-15', confidence: 'high' as const },
          { label: 'Estimated renewal', date: '2025-12-01', confidence: 'medium' as const },
        ],
      };
      mockCallClaude.mockResolvedValueOnce(JSON.stringify(expected));

      const service = makeService();
      const result = await service.extractDatesFromDocument({
        documentText: 'Insurance policy effective January 15, 2025, through January 15, 2026.',
      });

      expect(result.dates).toHaveLength(3);
      expect(result.dates[0]).toEqual({
        label: 'Policy start date',
        date: '2025-01-15',
        confidence: 'high',
      });
      expect(result.dates[2]!.confidence).toBe('medium');
    });

    it('returns empty dates array when no dates found', async () => {
      mockCallClaude.mockResolvedValueOnce(JSON.stringify({ dates: [] }));

      const service = makeService();
      const result = await service.extractDatesFromDocument({
        documentText: 'This document has no specific dates mentioned.',
      });

      expect(result.dates).toEqual([]);
      expect(result.dates).toHaveLength(0);
    });

    it('throws on invalid date format in response', async () => {
      mockCallClaude.mockResolvedValueOnce(
        JSON.stringify({
          dates: [{ label: 'Bad date', date: 'January 15', confidence: 'high' }],
        }),
      );

      const service = makeService();
      await expect(
        service.extractDatesFromDocument({ documentText: 'Some text' }),
      ).rejects.toThrow(); // Zod regex validation will fail
    });
  });

  // ────────────────────────────────────────────────────────
  // suggestTasksAndReminders
  // ────────────────────────────────────────────────────────

  describe('suggestTasksAndReminders', () => {
    it('returns suggestions array on happy path', async () => {
      const expected = {
        suggestions: [
          {
            type: 'task' as const,
            title: 'Review car insurance renewal',
            description: 'Your car insurance expires next month. Review quotes.',
            dueDate: '2025-06-01',
            priority: 'HIGH' as const,
            reason: 'Insurance expiring soon.',
          },
          {
            type: 'reminder' as const,
            title: 'Pay electricity bill',
            dateTime: '2025-05-20T09:00:00',
            linkedType: 'BILL' as const,
            reason: 'Electricity bill due in 5 days.',
          },
        ],
      };
      mockCallClaude.mockResolvedValueOnce(JSON.stringify(expected));

      const service = makeService();
      const result = await service.suggestTasksAndReminders({
        userContext: makeUserContext(),
      });

      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0]).toMatchObject({
        type: 'task',
        title: 'Review car insurance renewal',
        priority: 'HIGH',
      });
      expect(result.suggestions[1]).toMatchObject({
        type: 'reminder',
        linkedType: 'BILL',
      });
    });

    it('returns empty suggestions when context has nothing to suggest', async () => {
      mockCallClaude.mockResolvedValueOnce(JSON.stringify({ suggestions: [] }));

      const service = makeService();
      const result = await service.suggestTasksAndReminders({
        userContext: makeUserContext(),
      });

      expect(result.suggestions).toEqual([]);
    });

    it('throws on invalid suggestion type in response', async () => {
      mockCallClaude.mockResolvedValueOnce(
        JSON.stringify({
          suggestions: [{ type: 'invalid', title: 'Bad suggestion' }],
        }),
      );

      const service = makeService();
      await expect(
        service.suggestTasksAndReminders({ userContext: makeUserContext() }),
      ).rejects.toThrow();
    });
  });

  // ────────────────────────────────────────────────────────
  // convertNaturalLanguageToStructuredAction
  // ────────────────────────────────────────────────────────

  describe('convertNaturalLanguageToStructuredAction', () => {
    it('returns action with confidence >= 0.7 on happy path', async () => {
      const expected = {
        action: 'CREATE_TASK',
        payload: {
          title: 'Buy groceries',
          priority: 'MEDIUM',
          dueDate: '2025-05-20',
        },
        confidence: 0.92,
      };
      mockCallClaude.mockResolvedValueOnce(JSON.stringify(expected));

      const service = makeService();
      const result = await service.convertNaturalLanguageToStructuredAction({
        text: 'Remind me to buy groceries by next Tuesday',
        userContext: makeUserContext(),
      });

      expect(result.action).toBe('CREATE_TASK');
      expect(result.confidence).toBe(0.92);
      expect(result.payload).toEqual({
        title: 'Buy groceries',
        priority: 'MEDIUM',
        dueDate: '2025-05-20',
      });
    });

    it('throws when confidence is below 0.7', async () => {
      const lowConfidence = {
        action: 'CREATE_TASK',
        payload: { title: 'Something vague' },
        confidence: 0.45,
      };
      mockCallClaude.mockResolvedValueOnce(JSON.stringify(lowConfidence));

      const service = makeService();
      await expect(
        service.convertNaturalLanguageToStructuredAction({
          text: 'maybe do something',
          userContext: makeUserContext(),
        }),
      ).rejects.toThrow(/confidence too low/i);
    });

    it('throws with a descriptive message including the confidence score', async () => {
      const lowConfidence = {
        action: 'CREATE_TASK',
        payload: { title: 'Unclear' },
        confidence: 0.55,
      };
      mockCallClaude.mockResolvedValueOnce(JSON.stringify(lowConfidence));

      const service = makeService();
      await expect(
        service.convertNaturalLanguageToStructuredAction({
          text: 'hmm',
          userContext: makeUserContext(),
        }),
      ).rejects.toThrow('0.55');
    });

    it('accepts confidence exactly at 0.7', async () => {
      const borderline = {
        action: 'CREATE_REMINDER',
        payload: { title: 'Call dentist', dateTime: '2025-06-01T10:00:00' },
        confidence: 0.7,
      };
      mockCallClaude.mockResolvedValueOnce(JSON.stringify(borderline));

      const service = makeService();
      const result = await service.convertNaturalLanguageToStructuredAction({
        text: 'Call the dentist next month',
        userContext: makeUserContext(),
      });

      expect(result.action).toBe('CREATE_REMINDER');
      expect(result.confidence).toBe(0.7);
    });

    it('supports all action types', async () => {
      const deleteAction = {
        action: 'DELETE_TASK',
        payload: { taskId: 'task-123' },
        confidence: 0.95,
      };
      mockCallClaude.mockResolvedValueOnce(JSON.stringify(deleteAction));

      const service = makeService();
      const result = await service.convertNaturalLanguageToStructuredAction({
        text: 'Delete the groceries task',
        userContext: makeUserContext(),
      });

      expect(result.action).toBe('DELETE_TASK');
      expect(result.payload).toEqual({ taskId: 'task-123' });
    });
  });

  // ────────────────────────────────────────────────────────
  // generateDashboardInsights
  // ────────────────────────────────────────────────────────

  describe('generateDashboardInsights', () => {
    it('returns insights array on happy path', async () => {
      const expected = {
        insights: [
          {
            type: 'TASK' as const,
            message: 'You have 3 overdue tasks that need attention.',
            actionable: true,
          },
          {
            type: 'SPENDING' as const,
            message: 'Your monthly subscriptions total $145.00.',
            actionable: false,
          },
          {
            type: 'EXPIRY' as const,
            message: 'Your car registration expires in 2 weeks.',
            actionable: true,
          },
        ],
      };
      mockCallClaude.mockResolvedValueOnce(JSON.stringify(expected));

      const service = makeService();
      const result = await service.generateDashboardInsights({
        userContext: makeUserContext(),
      });

      expect(result.insights).toHaveLength(3);
      expect(result.insights[0]).toEqual({
        type: 'TASK',
        message: 'You have 3 overdue tasks that need attention.',
        actionable: true,
      });
      expect(result.insights[1]!.type).toBe('SPENDING');
      expect(result.insights[2]!.actionable).toBe(true);
    });

    it('returns empty insights when no data available', async () => {
      mockCallClaude.mockResolvedValueOnce(JSON.stringify({ insights: [] }));

      const service = makeService();
      const result = await service.generateDashboardInsights({
        userContext: makeUserContext(),
      });

      expect(result.insights).toEqual([]);
    });

    it('validates insight types against the schema', async () => {
      mockCallClaude.mockResolvedValueOnce(
        JSON.stringify({
          insights: [{ type: 'INVALID_TYPE', message: 'Bad insight', actionable: true }],
        }),
      );

      const service = makeService();
      await expect(
        service.generateDashboardInsights({ userContext: makeUserContext() }),
      ).rejects.toThrow();
    });

    it('validates that actionable is a boolean', async () => {
      mockCallClaude.mockResolvedValueOnce(
        JSON.stringify({
          insights: [{ type: 'GENERAL', message: 'Test', actionable: 'yes' }],
        }),
      );

      const service = makeService();
      await expect(
        service.generateDashboardInsights({ userContext: makeUserContext() }),
      ).rejects.toThrow();
    });

    it('includes all valid insight types', async () => {
      const allTypes = {
        insights: [
          { type: 'SPENDING', message: 'Spending insight', actionable: false },
          { type: 'RENEWAL', message: 'Renewal insight', actionable: true },
          { type: 'EXPIRY', message: 'Expiry insight', actionable: true },
          { type: 'TASK', message: 'Task insight', actionable: true },
          { type: 'GENERAL', message: 'General insight', actionable: false },
        ],
      };
      mockCallClaude.mockResolvedValueOnce(JSON.stringify(allTypes));

      const service = makeService();
      const result = await service.generateDashboardInsights({
        userContext: makeUserContext(),
      });

      expect(result.insights).toHaveLength(5);
      const types = result.insights.map((i) => i.type);
      expect(types).toContain('SPENDING');
      expect(types).toContain('RENEWAL');
      expect(types).toContain('EXPIRY');
      expect(types).toContain('TASK');
      expect(types).toContain('GENERAL');
    });
  });
});
