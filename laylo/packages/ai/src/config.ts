export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
export const MAX_RETRIES = 2;
export const TIMEOUT_MS = 30000;
export const TOKEN_BUDGETS = {
  summarize: 1024,
  extractDates: 512,
  chat: 2048,
  suggest: 1024,
  nlToAction: 512,
  insights: 1024,
};
