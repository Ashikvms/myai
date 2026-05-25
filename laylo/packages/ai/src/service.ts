import type {
  UserContext,
  DocumentSummary,
  ExtractedDate,
  TaskSuggestion,
  ReminderSuggestion,
  DashboardInsight,
  StructuredAction,
  DocumentCategory,
} from '@life-admin/shared';
import { createClaudeClient } from './client';
import { CLAUDE_MODEL_FAST, TOKEN_BUDGETS } from './config';
import * as summarizePrompt from './prompts/summarize';
import * as extractDatesPrompt from './prompts/extract-dates';
import * as chatPrompt from './prompts/chat';
import * as suggestPrompt from './prompts/suggest';
import * as nlToActionPrompt from './prompts/nl-to-action';
import * as insightsPrompt from './prompts/insights';
import * as extractBillPrompt from './prompts/extract-bill-from-email';
import * as extractAppointmentPrompt from './prompts/extract-appointment-from-email';
import * as inboxTriagePrompt from './prompts/inbox-triage';
import type {
  GmailMessageInput,
  ExtractedBill,
  ExtractedAppointment,
  InboxTriageSummary,
} from './types';

export interface AiService {
  summarizeDocument(input: {
    documentText: string;
    category: DocumentCategory;
  }): Promise<DocumentSummary>;

  extractDatesFromDocument(input: {
    documentText: string;
  }): Promise<{ dates: ExtractedDate[] }>;

  answerLifeAdminQuestion(input: {
    question: string;
    userContext: UserContext;
  }): AsyncIterable<string>;

  suggestTasksAndReminders(input: {
    userContext: UserContext;
  }): Promise<{ suggestions: Array<TaskSuggestion | ReminderSuggestion> }>;

  convertNaturalLanguageToStructuredAction(input: {
    text: string;
    userContext: UserContext;
  }): Promise<StructuredAction>;

  generateDashboardInsights(input: {
    userContext: UserContext;
  }): Promise<{ insights: DashboardInsight[] }>;

  /**
   * Extract a bill from a single Gmail message.
   *
   * Returns null when the message is not a bill or when the model
   * reports confidence below 0.6. Also returns null on any API or
   * validation error — Gmail processing must never crash the inbox
   * sync job.
   */
  extractBillFromEmail(email: GmailMessageInput): Promise<ExtractedBill | null>;

  /**
   * Extract an appointment / booking from a single Gmail message.
   * Same null-on-low-confidence-or-error contract as bill extraction.
   */
  extractAppointmentFromEmail(
    email: GmailMessageInput,
  ): Promise<ExtractedAppointment | null>;

  /**
   * Triage a batch of recent Gmail messages into mustAct / fyi / noise
   * with a dashboard headline. On error, returns a quiet-inbox stub
   * rather than throwing.
   */
  summarizeInboxTriage(emails: GmailMessageInput[]): Promise<InboxTriageSummary>;
}

function parseJsonResponse(text: string): unknown {
  // Strip markdown code fences if present (defensive)
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

export function createAiService(apiKey: string, model?: string): AiService {
  const client = createClaudeClient(apiKey, model);

  return {
    async summarizeDocument(input) {
      const response = await client.callClaude({
        system: summarizePrompt.systemPrompt,
        userMessage: summarizePrompt.buildUserMessage(input.documentText, input.category),
        maxTokens: TOKEN_BUDGETS.summarize,
      });

      const parsed = parseJsonResponse(response);
      const validated = summarizePrompt.outputSchema.parse(parsed);
      return validated;
    },

    async extractDatesFromDocument(input) {
      const response = await client.callClaude({
        system: extractDatesPrompt.systemPrompt,
        userMessage: extractDatesPrompt.buildUserMessage(input.documentText),
        maxTokens: TOKEN_BUDGETS.extractDates,
      });

      const parsed = parseJsonResponse(response);
      const validated = extractDatesPrompt.outputSchema.parse(parsed);
      return validated;
    },

    async *answerLifeAdminQuestion(input) {
      const stream = client.streamClaude({
        system: chatPrompt.systemPrompt,
        userMessage: chatPrompt.buildUserMessage(input.question, input.userContext),
        maxTokens: TOKEN_BUDGETS.chat,
      });

      for await (const chunk of stream) {
        yield chunk;
      }
    },

    async suggestTasksAndReminders(input) {
      const response = await client.callClaude({
        system: suggestPrompt.systemPrompt,
        userMessage: suggestPrompt.buildUserMessage(input.userContext),
        maxTokens: TOKEN_BUDGETS.suggest,
      });

      const parsed = parseJsonResponse(response);
      const validated = suggestPrompt.outputSchema.parse(parsed);
      return validated;
    },

    async convertNaturalLanguageToStructuredAction(input) {
      const response = await client.callClaude({
        system: nlToActionPrompt.systemPrompt,
        userMessage: nlToActionPrompt.buildUserMessage(input.text, input.userContext),
        maxTokens: TOKEN_BUDGETS.nlToAction,
      });

      const parsed = parseJsonResponse(response);
      const validated = nlToActionPrompt.outputSchema.parse(parsed);

      if (validated.confidence < 0.7) {
        throw new Error(
          `Action confidence too low (${validated.confidence.toFixed(2)}). ` +
          `The request "${input.text}" is too ambiguous to act on safely. ` +
          `Please be more specific.`,
        );
      }

      return validated;
    },

    async generateDashboardInsights(input) {
      const response = await client.callClaude({
        system: insightsPrompt.systemPrompt,
        userMessage: insightsPrompt.buildUserMessage(input.userContext),
        maxTokens: TOKEN_BUDGETS.insights,
      });

      const parsed = parseJsonResponse(response);
      const validated = insightsPrompt.outputSchema.parse(parsed);
      return validated;
    },

    async extractBillFromEmail(email) {
      try {
        const raw = await client.callClaudeTool({
          model: CLAUDE_MODEL_FAST,
          system: extractBillPrompt.systemPrompt,
          userMessage: extractBillPrompt.buildUserMessage(email),
          maxTokens: TOKEN_BUDGETS.extractBill,
          tool: extractBillPrompt.toolDefinition,
        });
        const parsed = extractBillPrompt.outputSchema.parse(raw);
        if (parsed.confidence < 0.6) return null;
        return {
          vendor: parsed.vendor,
          amount: parsed.amount,
          currency: parsed.currency,
          dueAt: parsed.dueAt ? new Date(parsed.dueAt) : null,
          billingCycle: parsed.billingCycle,
          category: parsed.category,
          confidence: parsed.confidence,
        };
      } catch (err) {
        console.error('[ai-service] extractBillFromEmail failed', {
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        });
        return null;
      }
    },

    async extractAppointmentFromEmail(email) {
      try {
        const raw = await client.callClaudeTool({
          model: CLAUDE_MODEL_FAST,
          system: extractAppointmentPrompt.systemPrompt,
          userMessage: extractAppointmentPrompt.buildUserMessage(email),
          maxTokens: TOKEN_BUDGETS.extractAppointment,
          tool: extractAppointmentPrompt.toolDefinition,
        });
        const parsed = extractAppointmentPrompt.outputSchema.parse(raw);
        if (parsed.confidence < 0.6) return null;
        return {
          title: parsed.title,
          startAt: new Date(parsed.startAt),
          endAt: parsed.endAt ? new Date(parsed.endAt) : null,
          location: parsed.location,
          virtual: parsed.virtual,
          attendees: parsed.attendees,
          notes: parsed.notes,
          confidence: parsed.confidence,
        };
      } catch (err) {
        console.error('[ai-service] extractAppointmentFromEmail failed', {
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        });
        return null;
      }
    },

    async summarizeInboxTriage(emails) {
      const empty: InboxTriageSummary = {
        headline: 'Inbox is quiet today.',
        mustAct: [],
        fyi: [],
        noise: 0,
      };

      if (emails.length === 0) return empty;

      try {
        const raw = await client.callClaudeTool({
          model: CLAUDE_MODEL_FAST,
          system: inboxTriagePrompt.systemPrompt,
          userMessage: inboxTriagePrompt.buildUserMessage(emails),
          maxTokens: TOKEN_BUDGETS.inboxTriage,
          tool: inboxTriagePrompt.toolDefinition,
        });
        const parsed = inboxTriagePrompt.outputSchema.parse(raw);
        return {
          headline: parsed.headline,
          mustAct: parsed.mustAct,
          fyi: parsed.fyi,
          noise: parsed.noise,
        };
      } catch (err) {
        console.error('[ai-service] summarizeInboxTriage failed', {
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        });
        return empty;
      }
    },
  };
}
