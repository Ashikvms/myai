import type { Request } from 'express';
import type { BankDataAccessAction } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

export interface AuditLogParams {
  userId: string;
  actorUserId?: string;
  action: BankDataAccessAction;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  context?: Record<string, unknown>;
}

/**
 * Insert a single row into BankDataAccessLog. Never throws — failures here
 * must not break the user request. We log internally instead.
 */
export async function writeAccessLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.bankDataAccessLog.create({
      data: {
        userId: params.userId,
        actorUserId: params.actorUserId ?? params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        context: params.context as never,
      },
    });
  } catch (err) {
    logger.error('Failed to write BankDataAccessLog', {
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      error: (err as Error).message,
    });
    // swallow — audit failure must not propagate
  }
}

/**
 * Write an authentication-failure audit row.
 *
 * Used for failed logins, registration attempts against existing
 * accounts, and similar pre-auth events where we don't yet have a real
 * `userId`. The schema requires `actorUserId` to be non-null, so we use
 * the sentinel string `'anonymous'` (length-bounded under 80 chars) — this
 * lets SOC2/breach-detection queries filter on
 * `actorUserId = 'anonymous' AND resource = 'AuthFailure'`.
 *
 * Never throws — audit failure must not break the auth flow.
 */
export async function writeAuthFailureLog(params: {
  email?: string;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.bankDataAccessLog.create({
      data: {
        userId: null,
        actorUserId: 'anonymous',
        action: 'WRITE',
        resource: 'AuthFailure',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        context: {
          email: params.email,
          reason: params.reason,
          ...(params.context ?? {}),
        } as never,
      },
    });
  } catch (err) {
    logger.error('Failed to write auth-failure audit log', {
      reason: params.reason,
      error: (err as Error).message,
    });
    // swallow — audit failure must not block auth response
  }
}

/**
 * Pull IP + UA from an Express request, falling back to undefined.
 */
export function extractRequestMeta(req: Request): { ipAddress?: string; userAgent?: string } {
  const ipAddress =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.ip ??
    req.socket?.remoteAddress ??
    undefined;
  const userAgent = req.headers['user-agent'] as string | undefined;
  return { ipAddress, userAgent };
}

/**
 * Convenience wrapper for routes: run `fn`, then write an audit log entry
 * with the request metadata. The log write happens regardless of whether
 * `fn` throws (failures are still audited via the catch path).
 */
export async function withAuditedRequest<T>(
  req: Request,
  action: BankDataAccessAction,
  resource: string,
  fn: () => Promise<T>,
  opts: { resourceId?: string; context?: Record<string, unknown> } = {},
): Promise<T> {
  const userId = req.user?.userId;
  if (!userId) {
    // Audited routes must be authed.
    throw new Error('withAuditedRequest requires req.user');
  }
  const meta = extractRequestMeta(req);

  try {
    const result = await fn();
    await writeAccessLog({
      userId,
      actorUserId: userId,
      action,
      resource,
      resourceId: opts.resourceId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      context: opts.context,
    });
    return result;
  } catch (err) {
    await writeAccessLog({
      userId,
      actorUserId: userId,
      action,
      resource,
      resourceId: opts.resourceId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      context: { ...(opts.context ?? {}), failed: true, error: (err as Error).message },
    });
    throw err;
  }
}
