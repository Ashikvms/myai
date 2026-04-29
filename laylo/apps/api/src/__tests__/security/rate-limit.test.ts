/**
 * Rate-limit tests for Plaid endpoints.
 *
 * The real `express-rate-limit` middleware is exercised end-to-end via
 * supertest with a tiny in-memory app — we do NOT mock the limiter. Env is
 * mocked at module-top so `webhookLimiter` and `plaidSyncLimiter` see
 * deterministic values.
 *
 * Spec targets:
 *  - webhookLimiter: 600 / minute / IP — 700 requests should yield 600 200s
 *    + 100 429s
 *  - plaidSyncLimiter: 1 / minute scoped by `:id` route param — 5 requests
 *    for the same id should yield 1 200 + 4 429s
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Express } from 'express';
import request from 'supertest';

vi.mock('../../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    RATE_LIMIT_WINDOW_MS: 60_000,
    RATE_LIMIT_MAX_REQUESTS: 1000,
    AUTH_RATE_LIMIT_MAX: 100,
  },
}));

vi.mock('../../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Each test gets a fresh limiter instance (and so a fresh in-memory bucket)
// by resetting the module registry.

async function buildWebhookApp(): Promise<Express> {
  vi.resetModules();
  // After resetModules vi.mock declarations are re-applied (they're hoisted),
  // so we don't need to re-doMock here.
  const { webhookLimiter } = await import('../../middleware/rateLimiter');
  const app = express();
  app.use(express.json());
  app.post('/webhook', webhookLimiter, (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

async function buildSyncApp(): Promise<Express> {
  vi.resetModules();
  const { plaidSyncLimiter } = await import('../../middleware/rateLimiter');
  const app = express();
  app.use(express.json());
  app.post('/items/:id/sync', plaidSyncLimiter, (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

// ── Tests ───────────────────────────────────────────────────────────

describe('webhookLimiter — 600 req / 60s / IP', () => {
  let app: Express;

  beforeEach(async () => {
    app = await buildWebhookApp();
  });

  it('accepts up to 600 requests then throttles the rest (700 total → 600/100)', async () => {
    let accepted = 0;
    let throttled = 0;

    for (let i = 0; i < 700; i++) {
      const res = await request(app).post('/webhook').send({});
      if (res.status === 200) accepted += 1;
      else if (res.status === 429) throttled += 1;
    }

    expect(accepted).toBe(600);
    expect(throttled).toBe(100);
  }, 60_000);

  it('returns the documented error envelope on 429', async () => {
    // Drain the bucket
    for (let i = 0; i < 600; i++) {
      await request(app).post('/webhook').send({});
    }
    const res = await request(app).post('/webhook').send({});
    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('WEBHOOK_RATE_LIMIT_EXCEEDED');
  }, 60_000);
});

describe('plaidSyncLimiter — 1 req / 60s scoped by :id', () => {
  let app: Express;

  beforeEach(async () => {
    app = await buildSyncApp();
  });

  it('accepts the first request and throttles 4 follow-ups for the same item id (5 → 1/4)', async () => {
    let accepted = 0;
    let throttled = 0;

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/items/item-AAA/sync').send({});
      if (res.status === 200) accepted += 1;
      else if (res.status === 429) throttled += 1;
    }

    expect(accepted).toBe(1);
    expect(throttled).toBe(4);
  });

  it('does NOT throttle a different :id (limiter is keyed by item id, not IP)', async () => {
    // Drain the bucket for item-X
    await request(app).post('/items/item-X/sync').send({});
    const throttledForX = await request(app).post('/items/item-X/sync').send({});
    expect(throttledForX.status).toBe(429);

    // A different item should still be allowed once
    const okForY = await request(app).post('/items/item-Y/sync').send({});
    expect(okForY.status).toBe(200);
  });

  it('returns the documented error envelope on 429', async () => {
    await request(app).post('/items/item-Z/sync').send({});
    const res = await request(app).post('/items/item-Z/sync').send({});
    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PLAID_SYNC_RATE_LIMIT_EXCEEDED');
  });
});
