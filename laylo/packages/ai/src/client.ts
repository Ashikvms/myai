import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_MODEL, MAX_RETRIES, TIMEOUT_MS } from './config';

export interface ClaudeCallParams {
  model?: string;
  system: string;
  userMessage: string;
  maxTokens: number;
}

export interface ClaudeClient {
  callClaude(params: ClaudeCallParams): Promise<string>;
  streamClaude(params: ClaudeCallParams): AsyncIterable<string>;
}

function safeLog(level: 'warn' | 'error', message: string, meta?: Record<string, unknown>): void {
  const logFn = level === 'warn' ? console.warn : console.error;
  logFn(`[ai-service] ${message}`, meta ? JSON.stringify(meta) : '');
}

export function createClaudeClient(apiKey: string, defaultModel?: string): ClaudeClient {
  const anthropic = new Anthropic({ apiKey });
  const model = defaultModel || CLAUDE_MODEL;

  async function callClaude(params: ClaudeCallParams): Promise<string> {
    const resolvedModel = params.model || model;
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await Promise.race([
          anthropic.messages.create({
            model: resolvedModel,
            max_tokens: params.maxTokens,
            system: params.system,
            messages: [{ role: 'user', content: params.userMessage }],
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Claude API request timed out')), TIMEOUT_MS),
          ),
        ]);

        safeLog('warn', 'Claude API call completed', {
          model: resolvedModel,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          attempt,
        });

        const textBlock = response.content.find((block) => block.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
          throw new Error('No text content in Claude response');
        }

        return textBlock.text;
      } catch (error) {
        lastError = error;

        if (error instanceof Error && error.message === 'Claude API request timed out') {
          safeLog('error', 'Claude API timeout', { attempt, model: resolvedModel });
          if (attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw error;
        }

        const statusCode = (error as { status?: number }).status;
        if (statusCode && statusCode >= 500 && attempt < MAX_RETRIES) {
          safeLog('warn', 'Claude API server error, retrying', {
            attempt,
            statusCode,
          });
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (statusCode === 429 && attempt < MAX_RETRIES) {
          safeLog('warn', 'Claude API rate limited, retrying', { attempt });
          const delay = Math.pow(2, attempt) * 2000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        safeLog('error', 'Claude API call failed', {
          attempt,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    }

    throw lastError;
  }

  async function* streamClaude(params: ClaudeCallParams): AsyncIterable<string> {
    const resolvedModel = params.model || model;

    try {
      const stream = await Promise.race([
        anthropic.messages.create({
          model: resolvedModel,
          max_tokens: params.maxTokens,
          system: params.system,
          messages: [{ role: 'user', content: params.userMessage }],
          stream: true,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Claude API stream request timed out')), TIMEOUT_MS),
        ),
      ]);

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield event.delta.text;
        }
      }

      safeLog('warn', 'Claude streaming call completed', {
        model: resolvedModel,
      });
    } catch (error) {
      safeLog('error', 'Claude streaming call failed', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  return { callClaude, streamClaude };
}
