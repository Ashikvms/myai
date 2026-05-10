export { createAiService } from './service';
export type { AiService } from './service';

export * as summarizePrompt from './prompts/summarize';
export * as extractDatesPrompt from './prompts/extract-dates';
export * as chatPrompt from './prompts/chat';
export * as suggestPrompt from './prompts/suggest';
export * as nlToActionPrompt from './prompts/nl-to-action';
export * as insightsPrompt from './prompts/insights';

export {
  explainTransaction,
  buildMockExplanation,
  buildTransactionExplainerUserMessage,
  transactionExplainerSystemPrompt,
  TRANSACTION_EXPLAINER_TOKEN_BUDGET,
} from './transaction-explainer';
export type {
  TransactionExplainerInput,
  TransactionExplanation,
} from './transaction-explainer';
