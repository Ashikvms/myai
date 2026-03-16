import { env } from './config/env';
import { logger } from './config/logger';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
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

// ── Body parsing ───────────────────────

app.use(express.json({ limit: '10mb' }));

// ── Rate limiting ──────────────────────

app.use(globalLimiter);

// ── Health check ───────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

// ── Error handler ──────────────────────

app.use(errorHandler);

// ── Start server ───────────────────────

app.listen(env.PORT, () => {
  logger.info(`Life Admin API running on port ${env.PORT}`, {
    environment: env.NODE_ENV,
    port: env.PORT,
  });
});

export default app;
