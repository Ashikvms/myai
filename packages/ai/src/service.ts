// AI Service — placeholder. Full implementation in Section 6.
// This file establishes the interface contract.

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

export function createAiService(_apiKey: string, _model?: string): AiService {
  // Full implementation in Section 6 — AI Service Layer
  throw new Error(
    'AI Service not yet implemented. Complete in Section 6.',
  );
}
