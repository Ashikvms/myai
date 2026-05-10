import { createClaudeClient } from './client';
import { TOKEN_BUDGETS } from './config';

/**
 * Input shape for the transaction explainer. We accept a flat object so
 * the caller (the API route) can build it from a Prisma row + computed
 * pattern stats without importing Prisma types here.
 *
 * Strings are deliberately untyped beyond `string | null` — the prompt
 * builder is defensive and tolerates missing fields.
 */
export interface TransactionExplainerInput {
  transaction: {
    name: string;
    merchantName: string | null;
    amount: number;
    isoCurrencyCode: string;
    date: string; // ISO date
    category: string | null;
    categoryDetailed: string | null;
    paymentChannel: string | null;
    isoLocationCity: string | null;
    isoLocationRegion: string | null;
    isoLocationCountry: string | null;
  };
  pattern: {
    merchantName: string;
    txCount: number;
    totalSpent: number;
    avgAmount: number;
    firstSeen: string | null;
  };
  extraContext?: string;
}

export interface TransactionExplanation {
  explanation: string;
  generatedAt: string;
  mock: boolean;
}

export const TRANSACTION_EXPLAINER_TOKEN_BUDGET = 256;

export const transactionExplainerSystemPrompt = `You are a friendly personal finance assistant.

Given a single bank transaction and a small recurrence summary for the same
merchant over the last 30 days, write a short, warm, plain-language
explanation of what the charge most likely was. Cleanup cryptic merchant
strings (e.g. "SQ *BLUE BOTTLE 1234" → "Blue Bottle Coffee"). When the
recurrence count is high, mention the pattern naturally ("you stop here
about twice a week"). When it is one-off, say so.

Hard rules:
- Output 2-3 sentences total. No lists, no headings, no markdown.
- Never invent facts not in the input. Don't guess at merchant identity if
  the name is genuinely unrecognisable — describe what you can see (channel,
  category, amount).
- Don't moralise about spending. No "you should" sentences.
- Speak directly to the user in second person ("You spent…").`;

export function buildTransactionExplainerUserMessage(
  input: TransactionExplainerInput,
): string {
  const { transaction: t, pattern: p, extraContext } = input;
  const lines: string[] = [];

  lines.push('Transaction:');
  lines.push(`  Raw name: ${t.name}`);
  if (t.merchantName) lines.push(`  Merchant: ${t.merchantName}`);
  lines.push(`  Amount: ${t.amount.toFixed(2)} ${t.isoCurrencyCode}`);
  lines.push(`  Date: ${t.date}`);
  if (t.category) lines.push(`  Category: ${t.category}`);
  if (t.categoryDetailed) lines.push(`  Detailed category: ${t.categoryDetailed}`);
  if (t.paymentChannel) lines.push(`  Payment channel: ${t.paymentChannel}`);
  const loc = [t.isoLocationCity, t.isoLocationRegion, t.isoLocationCountry]
    .filter(Boolean)
    .join(', ');
  if (loc) lines.push(`  Location: ${loc}`);

  lines.push('');
  lines.push('Pattern (last 30 days, this user, this merchant):');
  lines.push(`  Charges: ${p.txCount}`);
  lines.push(`  Total: ${p.totalSpent.toFixed(2)} ${t.isoCurrencyCode}`);
  lines.push(`  Average per charge: ${p.avgAmount.toFixed(2)} ${t.isoCurrencyCode}`);
  if (p.firstSeen) lines.push(`  First seen (last 90d): ${p.firstSeen}`);

  if (extraContext) {
    lines.push('');
    lines.push(`User asked: ${extraContext}`);
  }

  lines.push('');
  lines.push('Explain this charge in 2-3 friendly sentences.');

  return `<user_input>\n${lines.join('\n')}\n</user_input>`;
}

/**
 * Hand-written fallback used when the Anthropic API key is the dev
 * placeholder. Mirrors the structure of a real model response so frontend
 * code does not need to special-case mock mode.
 */
export function buildMockExplanation(input: TransactionExplainerInput): string {
  const { transaction: t, pattern: p } = input;
  const merchant = (t.merchantName || t.name || 'this merchant').replace(
    /\s+/g,
    ' ',
  ).trim();
  const amount = `${t.amount.toFixed(2)} ${t.isoCurrencyCode}`;
  const channel = t.paymentChannel ? ` via ${t.paymentChannel}` : '';
  const where = t.isoLocationCity
    ? ` in ${t.isoLocationCity}${t.isoLocationRegion ? `, ${t.isoLocationRegion}` : ''}`
    : '';

  let pattern: string;
  if (p.txCount >= 4) {
    pattern = ` You've shopped here ${p.txCount} times in the last 30 days, spending about ${p.totalSpent.toFixed(2)} ${t.isoCurrencyCode} total.`;
  } else if (p.txCount === 1) {
    pattern = ' This looks like a one-off charge for now.';
  } else {
    pattern = ` You've been here ${p.txCount} times in the last 30 days.`;
  }

  const category = t.category
    ? ` Category looks like ${t.category.toLowerCase().replace(/_/g, ' ')}.`
    : '';

  return `You spent ${amount} at ${merchant}${where}${channel} on ${t.date}.${pattern}${category}`.trim();
}

/**
 * Generate a friendly explanation of a single transaction.
 *
 * - If `apiKey` is the dev placeholder `sk-ant-placeholder-not-real`, returns
 *   a hand-written mock and sets `mock: true`. This keeps local dev free.
 * - Otherwise calls the Anthropic API via the shared client.
 */
export async function explainTransaction(
  input: TransactionExplainerInput,
  options: { apiKey: string; model?: string } = { apiKey: '' },
): Promise<TransactionExplanation> {
  const generatedAt = new Date().toISOString();

  if (options.apiKey === 'sk-ant-placeholder-not-real' || !options.apiKey) {
    return {
      explanation: buildMockExplanation(input),
      generatedAt,
      mock: true,
    };
  }

  const client = createClaudeClient(options.apiKey, options.model);
  const text = await client.callClaude({
    system: transactionExplainerSystemPrompt,
    userMessage: buildTransactionExplainerUserMessage(input),
    maxTokens: TRANSACTION_EXPLAINER_TOKEN_BUDGET,
  });

  return {
    explanation: text.trim(),
    generatedAt,
    mock: false,
  };
}
