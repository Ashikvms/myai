import { z } from 'zod';

const baseSchema = z.object({
  // Required
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_PRIVATE_KEY: z.string().min(1, 'JWT_PRIVATE_KEY is required (base64-encoded PEM)'),
  JWT_PUBLIC_KEY: z.string().min(1, 'JWT_PUBLIC_KEY is required (base64-encoded PEM)'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),

  // Optional — Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional().default('http://localhost:3001/api/auth/google/callback'),
  // Separate redirect for the LINK flow (logged-in user adding Calendar/Gmail
  // scopes WITHOUT replacing their session). Must be registered in the Google
  // Cloud console alongside GOOGLE_CALLBACK_URL.
  GOOGLE_LINK_REDIRECT_URI: z
    .string()
    .url()
    .optional()
    .default('http://localhost:3001/api/google/link/callback'),
  // Where to bounce the browser AFTER the link flow completes — the web app
  // settings page typically. Falls back to APP_URL if unset.
  GOOGLE_LINK_SUCCESS_REDIRECT: z.string().optional(),
  // Comma-separated scopes. We keep them in env so a deployment can dial
  // them down (e.g. drop gmail.modify) without redeploying code.
  GOOGLE_CALENDAR_SCOPES: z
    .string()
    .default('https://www.googleapis.com/auth/calendar'),
  GOOGLE_GMAIL_SCOPES: z
    .string()
    .default(
      'https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.modify',
    ),

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

/**
 * Production-only requirements.
 *
 * In dev/test we want to be able to spin up with the bare minimum, but
 * production deploys MUST have observability, queueing, mail, storage,
 * a non-localhost CORS allow-list, and TLS-enforced Postgres.
 */
const envSchema = baseSchema.superRefine((data, ctx) => {
  if (data.NODE_ENV !== 'production') return;

  const requiredInProd: Array<[keyof typeof data, string]> = [
    ['REDIS_URL', 'REDIS_URL is required in production (BullMQ + rate-limit store)'],
    ['SENTRY_DSN', 'SENTRY_DSN is required in production (error tracking)'],
    ['RESEND_API_KEY', 'RESEND_API_KEY is required in production (transactional email)'],
    ['R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY_ID is required in production (file uploads)'],
    ['R2_SECRET_ACCESS_KEY', 'R2_SECRET_ACCESS_KEY is required in production (file uploads)'],
    ['R2_BUCKET_NAME', 'R2_BUCKET_NAME is required in production (file uploads)'],
  ];

  for (const [key, message] of requiredInProd) {
    if (!data[key]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message });
    }
  }

  // CORS must not include localhost in production — would let any local
  // dev server steal cookies via a tricked user.
  const origins = data.ALLOWED_ORIGINS.split(',').map((o) => o.trim().toLowerCase());
  if (origins.some((o) => o.includes('localhost') || o.includes('127.0.0.1'))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ALLOWED_ORIGINS'],
      message:
        'ALLOWED_ORIGINS must not contain localhost / 127.0.0.1 in production',
    });
  }

  // Database connection must enforce TLS in production. Both
  // `?sslmode=require` (libpq style) and `?ssl=true` (Prisma alias)
  // are accepted.
  const dbUrl = data.DATABASE_URL.toLowerCase();
  const hasSslFlag =
    dbUrl.includes('sslmode=require') ||
    dbUrl.includes('sslmode=verify-ca') ||
    dbUrl.includes('sslmode=verify-full') ||
    dbUrl.includes('ssl=true');
  if (!hasSslFlag) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DATABASE_URL'],
      message:
        'DATABASE_URL must include `?sslmode=require` (or `?ssl=true`) in production',
    });
  }
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
