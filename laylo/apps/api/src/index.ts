import { env } from './config/env';
import { logger } from './config/logger';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import passport from 'passport';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import tasksRouter from './routes/tasks';
import billsRouter from './routes/bills';
import subscriptionsRouter from './routes/subscriptions';
import documentsRouter from './routes/documents';
import appointmentsRouter from './routes/appointments';
import remindersRouter from './routes/reminders';
import dashboardRouter from './routes/dashboard';
import settingsRouter from './routes/settings';
import aiRouter from './routes/ai';
import plaidRouter, { plaidWebhookHandler } from './routes/plaid';
import transactionsRouter, { aiExplainTransactionRouter } from './routes/transactions';
import accountsRouter from './routes/accounts';
import { healthRouter } from './routes/health';
import { startJobQueue } from './jobs/queue';

const app = express();

// ── Security ───────────────────────────

app.use(helmet());

const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  }),
);

// ── Plaid webhook (raw body, BEFORE express.json) ─────
//
// Plaid signs the raw request body. The signature header refers to a
// SHA-256 of the bytes Plaid sent us, so we MUST mount the webhook
// route with `express.raw()` BEFORE the global JSON parser. The Plaid
// router gates on `/webhook` only — every other Plaid route is mounted
// later under the JSON parser.

app.post(
  '/api/plaid/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  ...plaidWebhookHandler,
);

// ── Body parsing ───────────────────────

app.use(express.json({ limit: '10mb' }));

// ── Rate limiting ──────────────────────

app.use(globalLimiter);

// ── Health check ───────────────────────

app.use('/health', healthRouter);

// ── Passport (Google OAuth) ────────────
//
// Required by passport.authenticate('google', ...) middleware mounted
// inside /api/auth. Sessions are NOT used (we issue our own JWTs), so we
// only call .initialize() — no .session().

app.use(passport.initialize());

// ── Routes ─────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRouter);
app.use('/api/bills', billsRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/ai', aiRouter);
// Item 28: POST /api/ai/explain-transaction/:id (handler in transactions.ts)
app.use('/api/ai', aiExplainTransactionRouter);
app.use('/api/plaid', plaidRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/accounts', accountsRouter);

// ── Error handler ──────────────────────

app.use(errorHandler);

// ── Start server ───────────────────────

app.listen(env.PORT, () => {
  logger.info(`Life Admin API running on port ${env.PORT}`, {
    environment: env.NODE_ENV,
    port: env.PORT,
  });

  // Start job queue (non-blocking — Redis is optional)
  startJobQueue().catch((err) => {
    logger.warn('Job queue failed to start — running without background jobs', {
      error: (err as Error).message,
    });
  });
});

export default app;
