import { env } from './config/env';
import { logger } from './config/logger';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';

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
