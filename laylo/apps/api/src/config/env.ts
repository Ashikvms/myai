import { z } from 'zod';

const envSchema = z.object({
  // Required
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_PRIVATE_KEY: z.string().min(1, 'JWT_PRIVATE_KEY is required (base64-encoded PEM)'),
  JWT_PUBLIC_KEY: z.string().min(1, 'JWT_PUBLIC_KEY is required (base64-encoded PEM)'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),

  // Optional — Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional().default('http://localhost:3001/api/auth/google/callback'),

  // Optional — infrastructure
  REDIS_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),

  // Optional — R2 / storage
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),

  // Optional — AI
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-20250514'),

  // Optional — server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:8081'),
  APP_URL: z.string().default('http://localhost:3000'),

  // Optional — rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),

  // ── Plaid integration ─────────────────────
  PLAID_CLIENT_ID: z.string().min(1, 'PLAID_CLIENT_ID is required'),
  PLAID_SECRET: z.string().min(1, 'PLAID_SECRET is required'),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  PLAID_PRODUCTS: z.string().default('transactions'),
  PLAID_COUNTRY_CODES: z.string().default('US'),
  PLAID_WEBHOOK_URL: z.string().url().optional(),
  PLAID_REDIRECT_URI: z.string().url().optional(),

  // ── Encryption (REQUIRED for Plaid) ───────
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/, 'ENCRYPTION_KEY must be 64 hex chars (32 bytes)'),
  ENCRYPTION_KEY_VERSION: z.coerce.number().int().min(1).default(1),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`\nEnvironment validation failed:\n${formatted}\n`);
    process.exit(1);
  }

  return result.data;
}

export const env: Env = parseEnv();
