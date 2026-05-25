export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
/**
 * Cheaper/faster Sonnet variant used for high-volume Gmail processing.
 * Override via env to pin a specific snapshot. Falls back to the alias.
 */
export const CLAUDE_MODEL_FAST = process.env.CLAUDE_MODEL_FAST || 'claude-sonnet-4-6';
export const MAX_RETRIES = 2;
export const TIMEOUT_MS = 30000;
export const TOKEN_BUDGETS = {
  summarize: 1024,
  extractDates: 512,
  chat: 2048,
  suggest: 1024,
  nlToAction: 512,
  insights: 1024,
  // Gmail integrations — tight budgets because the response is a tool call,
  // not free-form prose. Triage gets more headroom for the bucketed lists.
  extractBill: 400,
  extractAppointment: 400,
  inboxTriage: 1500,
};
