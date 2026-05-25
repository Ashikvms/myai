import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_MODEL, MAX_RETRIES, TIMEOUT_MS } from './config';

export interface ClaudeCallParams {
  model?: string;
  system: string;
  userMessage: string;
  maxTokens: number;
}

/**
 * Parameters for a tool-constrained Claude call with prompt caching.
 *
 * Uses the beta prompt-caching endpoint so the (long, static) system
 * prompt + tool schema are cached across calls — every Gmail message
 * processed reuses the same cache entry, slashing token cost.
 *
 * The model is forced to call `tool.name`, so the response always
 * contains exactly one tool_use block with input matching the schema.
 */
export interface ClaudeToolCallParams {
  model?: string;
  system: string;
  userMessage: string;
  maxTokens: number;
  tool: {
    name: string;
    description: string;
    input_schema: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface ClaudeClient {
  callClaude(params: ClaudeCallParams): Promise<string>;
  streamClaude(params: ClaudeCallParams): AsyncIterable<string>;
  /**
   * Calls Claude with a single forced tool. Returns the tool's `input`
   * object verbatim — Zod validation happens at the call site.
   */
  callClaudeTool(params: ClaudeToolCallParams): Promise<unknown>;
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

  async function callClaudeTool(params: ClaudeToolCallParams): Promise<unknown> {
    const resolvedModel = params.model || model;
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await Promise.race([
          anthropic.beta.promptCaching.messages.create({
            model: resolvedModel,
            max_tokens: params.maxTokens,
            // System block as an array so we can attach cache_control. The
            // system prompt + tool schema are reused across every Gmail
            // message processed → cache hit on every call after the first.
            system: [
              {
                type: 'text',
                text: params.system,
                cache_control: { type: 'ephemeral' },
              },
            ],
            tools: [
              {
                name: params.tool.name,
                description: params.tool.description,
                input_schema: params.tool.input_schema,
                cache_control: { type: 'ephemeral' },
              },
            ],
            tool_choice: { type: 'tool', name: params.tool.name },
            messages: [{ role: 'user', content: params.userMessage }],
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Claude API request timed out')), TIMEOUT_MS),
          ),
        ]);

        safeLog('warn', 'Claude tool call completed', {
          model: resolvedModel,
          tool: params.tool.name,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
          cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
          attempt,
        });

        const toolBlock = response.content.find(
          (block): block is { type: 'tool_use'; id: string; name: string; input: unknown } =>
            block.type === 'tool_use',
        );
        if (!toolBlock) {
          throw new Error(
            `No tool_use block in Claude response (got: ${response.content.map((b) => b.type).join(', ')})`,
          );
        }

        return toolBlock.input;
      } catch (error) {
        lastError = error;

        if (error instanceof Error && error.message === 'Claude API request timed out') {
          safeLog('error', 'Claude tool call timeout', { attempt, model: resolvedModel });
          if (attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw error;
        }

        const statusCode = (error as { status?: number }).status;
        if (statusCode && statusCode >= 500 && attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (statusCode === 429 && attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 2000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        safeLog('error', 'Claude tool call failed', {
          attempt,
          tool: params.tool.name,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    }

    throw lastError;
  }

  return { callClaude, streamClaude, callClaudeTool };
}
