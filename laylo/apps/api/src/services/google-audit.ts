/**
 * Audit log writer for Google data access.
 *
 * Mirrors `services/audit-log.ts` (BankDataAccessLog) but writes into the
 * separate `GoogleDataAccessLog` table so retention/PII policy can diverge
 * between bank and Google data, and so the resource taxonomy (calendar /
 * gmail / oauth) stays cleanly scoped.
 *
 * NEVER throws — audit failure must not propagate into the user-facing
 * request path. We log internally instead.
 */

import type { Request } from 'express';
import type { GoogleDataAccessAction } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

export interface GoogleAuditLogParams {
  userId: string;
  actorUserId?: string;
  action: GoogleDataAccessAction;
  /** Broad surface — 'calendar' | 'gmail' | 'oauth'. */
  scope: string;
  /** Specific operation, e.g. 'events.list', 'messages.modify'. */
  endpoint: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  context?: Record<string, unknown>;
}

export async function writeGoogleAccessLog(params: GoogleAuditLogParams): Promise<void> {
  try {
    await prisma.googleDataAccessLog.create({
      data: {
        userId: params.userId,
        actorUserId: params.actorUserId ?? params.userId,
        action: params.action,
        scope: params.scope.slice(0, 40),
        endpoint: params.endpoint.slice(0, 120),
        resourceId: params.resourceId?.slice(0, 120),
        ipAddress: params.ipAddress?.slice(0, 64),
        userAgent: params.userAgent?.slice(0, 400),
        context: params.context as never,
      },
    });
  } catch (err) {
    logger.error('Failed to write GoogleDataAccessLog', {
      userId: params.userId,
      action: params.action,
      scope: params.scope,
      endpoint: params.endpoint,
      error: (err as Error).message,
    });
    // swallow — audit failure must not propagate
  }
}

/** Pull IP + UA from an Express request. */
export function extractGoogleRequestMeta(req: Request): {
  ipAddress?: string;
  userAgent?: string;
} {
  const ipAddress =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.ip ??
    req.socket?.remoteAddress ??
    undefined;
  const userAgent = req.headers['user-agent'] as string | undefined;
  return { ipAddress, userAgent };
}
