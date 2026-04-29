/**
 * Plaid webhook contract test.
 *
 * Validates representative payload variants for each Plaid webhook code we
 * care about against a Zod schema defined LOCALLY here (per spec: do not
 * add a global webhook schema).
 *
 * Payloads are minimal but match Plaid's documented TypeScript SDK types:
 *   https://plaid.com/docs/api/webhooks/
 *
 * The goal is to catch any drift between what we expect to receive and what
 * Plaid actually sends — a mis-shaped payload should fail loudly here.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ── Schemas (test-local, not exported to app) ───────────────────────

const baseWebhookSchema = z.object({
  webhook_type: z.string().min(1),
  webhook_code: z.string().min(1),
  // Plaid includes `environment` on every webhook (sandbox|development|production)
  environment: z.string().optional(),
});

const itemIdSchema = z.string().min(1);

const plaidErrorSchema = z.object({
  error_type: z.string(),
  error_code: z.string(),
  error_message: z.string(),
  display_message: z.string().nullable().optional(),
  request_id: z.string().optional(),
  causes: z.array(z.unknown()).optional(),
  status: z.number().nullable().optional(),
});

// TRANSACTIONS / SYNC_UPDATES_AVAILABLE
const syncUpdatesAvailableSchema = baseWebhookSchema.extend({
  webhook_type: z.literal('TRANSACTIONS'),
  webhook_code: z.literal('SYNC_UPDATES_AVAILABLE'),
  item_id: itemIdSchema,
  initial_update_complete: z.boolean(),
  historical_update_complete: z.boolean(),
  request_id: z.string().optional(),
});

// TRANSACTIONS / INITIAL_UPDATE (legacy)
const initialUpdateSchema = baseWebhookSchema.extend({
  webhook_type: z.literal('TRANSACTIONS'),
  webhook_code: z.literal('INITIAL_UPDATE'),
  item_id: itemIdSchema,
  new_transactions: z.number().int().nonnegative(),
  request_id: z.string().optional(),
});

// TRANSACTIONS / HISTORICAL_UPDATE (legacy)
const historicalUpdateSchema = baseWebhookSchema.extend({
  webhook_type: z.literal('TRANSACTIONS'),
  webhook_code: z.literal('HISTORICAL_UPDATE'),
  item_id: itemIdSchema,
  new_transactions: z.number().int().nonnegative(),
  request_id: z.string().optional(),
});

// TRANSACTIONS / DEFAULT_UPDATE (legacy)
const defaultUpdateSchema = baseWebhookSchema.extend({
  webhook_type: z.literal('TRANSACTIONS'),
  webhook_code: z.literal('DEFAULT_UPDATE'),
  item_id: itemIdSchema,
  new_transactions: z.number().int().nonnegative(),
  request_id: z.string().optional(),
});

// ITEM / ERROR
const itemErrorSchema = baseWebhookSchema.extend({
  webhook_type: z.literal('ITEM'),
  webhook_code: z.literal('ERROR'),
  item_id: itemIdSchema,
  error: plaidErrorSchema,
  request_id: z.string().optional(),
});

// ITEM / PENDING_EXPIRATION
const itemPendingExpirationSchema = baseWebhookSchema.extend({
  webhook_type: z.literal('ITEM'),
  webhook_code: z.literal('PENDING_EXPIRATION'),
  item_id: itemIdSchema,
  consent_expiration_time: z.string().datetime(),
  request_id: z.string().optional(),
});

// ITEM / USER_PERMISSION_REVOKED
const itemUserPermissionRevokedSchema = baseWebhookSchema.extend({
  webhook_type: z.literal('ITEM'),
  webhook_code: z.literal('USER_PERMISSION_REVOKED'),
  item_id: itemIdSchema,
  // Plaid sends an error block here too
  error: plaidErrorSchema.optional(),
  request_id: z.string().optional(),
});

// ── Sample payloads ─────────────────────────────────────────────────

const SAMPLES = {
  syncUpdatesAvailable: {
    webhook_type: 'TRANSACTIONS',
    webhook_code: 'SYNC_UPDATES_AVAILABLE',
    item_id: 'gAXlMgVEw5uEGoQnnXZ6tn9E7Mn3LBc4PJVKZ',
    initial_update_complete: true,
    historical_update_complete: false,
    environment: 'sandbox',
    request_id: 'foo123',
  },
  initialUpdate: {
    webhook_type: 'TRANSACTIONS',
    webhook_code: 'INITIAL_UPDATE',
    item_id: 'gAXlMgVEw5uEGoQnnXZ6tn9E7Mn3LBc4PJVKZ',
    new_transactions: 19,
    environment: 'sandbox',
    request_id: 'init123',
  },
  historicalUpdate: {
    webhook_type: 'TRANSACTIONS',
    webhook_code: 'HISTORICAL_UPDATE',
    item_id: 'gAXlMgVEw5uEGoQnnXZ6tn9E7Mn3LBc4PJVKZ',
    new_transactions: 87,
    environment: 'sandbox',
    request_id: 'hist123',
  },
  defaultUpdate: {
    webhook_type: 'TRANSACTIONS',
    webhook_code: 'DEFAULT_UPDATE',
    item_id: 'gAXlMgVEw5uEGoQnnXZ6tn9E7Mn3LBc4PJVKZ',
    new_transactions: 3,
    environment: 'sandbox',
    request_id: 'def123',
  },
  itemError: {
    webhook_type: 'ITEM',
    webhook_code: 'ERROR',
    item_id: 'gAXlMgVEw5uEGoQnnXZ6tn9E7Mn3LBc4PJVKZ',
    error: {
      error_type: 'ITEM_ERROR',
      error_code: 'ITEM_LOGIN_REQUIRED',
      error_message: 'the login details of this item have changed (credentials, MFA, or required user action) and a user login is required to update this information',
      display_message: null,
      request_id: 'm8MDnv9okwxFNBV',
      status: 400,
      causes: [],
    },
    environment: 'sandbox',
  },
  itemPendingExpiration: {
    webhook_type: 'ITEM',
    webhook_code: 'PENDING_EXPIRATION',
    item_id: 'gAXlMgVEw5uEGoQnnXZ6tn9E7Mn3LBc4PJVKZ',
    consent_expiration_time: '2026-12-25T00:00:00Z',
    environment: 'sandbox',
  },
  itemUserPermissionRevoked: {
    webhook_type: 'ITEM',
    webhook_code: 'USER_PERMISSION_REVOKED',
    item_id: 'gAXlMgVEw5uEGoQnnXZ6tn9E7Mn3LBc4PJVKZ',
    error: {
      error_type: 'ITEM_ERROR',
      error_code: 'USER_PERMISSION_REVOKED',
      error_message: 'the user has revoked access to their account',
      display_message: null,
      request_id: 'revoke123',
      status: 400,
    },
    environment: 'sandbox',
  },
};

// ── Tests ───────────────────────────────────────────────────────────

describe('Plaid webhook contract', () => {
  it('validates TRANSACTIONS/SYNC_UPDATES_AVAILABLE', () => {
    const r = syncUpdatesAvailableSchema.safeParse(SAMPLES.syncUpdatesAvailable);
    expect(r.success).toBe(true);
  });

  it('validates TRANSACTIONS/INITIAL_UPDATE', () => {
    const r = initialUpdateSchema.safeParse(SAMPLES.initialUpdate);
    expect(r.success).toBe(true);
  });

  it('validates TRANSACTIONS/HISTORICAL_UPDATE', () => {
    const r = historicalUpdateSchema.safeParse(SAMPLES.historicalUpdate);
    expect(r.success).toBe(true);
  });

  it('validates TRANSACTIONS/DEFAULT_UPDATE', () => {
    const r = defaultUpdateSchema.safeParse(SAMPLES.defaultUpdate);
    expect(r.success).toBe(true);
  });

  it('validates ITEM/ERROR', () => {
    const r = itemErrorSchema.safeParse(SAMPLES.itemError);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.error.error_code).toBe('ITEM_LOGIN_REQUIRED');
    }
  });

  it('validates ITEM/PENDING_EXPIRATION (with ISO datetime consent_expiration_time)', () => {
    const r = itemPendingExpirationSchema.safeParse(SAMPLES.itemPendingExpiration);
    expect(r.success).toBe(true);
  });

  it('validates ITEM/USER_PERMISSION_REVOKED', () => {
    const r = itemUserPermissionRevokedSchema.safeParse(SAMPLES.itemUserPermissionRevoked);
    expect(r.success).toBe(true);
  });

  it('rejects payload missing webhook_type / webhook_code', () => {
    const r = baseWebhookSchema.safeParse({ item_id: 'x' });
    expect(r.success).toBe(false);
  });

  it('rejects ITEM/ERROR without error block', () => {
    const broken = { ...SAMPLES.itemError } as Record<string, unknown>;
    delete broken.error;
    const r = itemErrorSchema.safeParse(broken);
    expect(r.success).toBe(false);
  });

  it('rejects SYNC_UPDATES_AVAILABLE with wrong webhook_code', () => {
    const r = syncUpdatesAvailableSchema.safeParse({
      ...SAMPLES.syncUpdatesAvailable,
      webhook_code: 'SOMETHING_ELSE',
    });
    expect(r.success).toBe(false);
  });

  it('rejects PENDING_EXPIRATION with non-ISO consent_expiration_time', () => {
    const r = itemPendingExpirationSchema.safeParse({
      ...SAMPLES.itemPendingExpiration,
      consent_expiration_time: 'not-a-date',
    });
    expect(r.success).toBe(false);
  });
});
