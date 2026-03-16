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
import { TOKEN_BUDGETS } from './config';
import * as summarizePrompt from './prompts/summarize';
import * as extractDatesPrompt from './prompts/extract-dates';
import * as chatPrompt from './prompts/chat';
import * as suggestPrompt from './prompts/suggest';
import * as nlToActionPrompt from './prompts/nl-to-action';
import * as insightsPrompt from './prompts/insights';

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
  };
}
