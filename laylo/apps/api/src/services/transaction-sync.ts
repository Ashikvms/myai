import type { Transaction as PlaidTransaction } from 'plaid';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { decryptAccessToken } from './crypto';
import { transactionsSync, PlaidError } from './plaid';
import { writeAccessLog } from './audit-log';

export interface SyncResult {
  added: number;
  modified: number;
  removed: number;
}

/**
 * Pull transactions for a single PlaidItem using `/transactions/sync`.
 * - Loops while `has_more=true`.
 * - Upserts added/modified, hard-deletes removed, persists new cursor.
 * - On `ITEM_LOGIN_REQUIRED`, marks the item as LOGIN_REQUIRED.
 * - Writes a BankDataAccessLog entry on completion.
 */
export async function syncItem(plaidItemId: string): Promise<SyncResult> {
  const item = await prisma.plaidItem.findUnique({
    where: { id: plaidItemId },
    include: { accounts: true },
  });

  if (!item) {
    throw new Error(`PlaidItem not found: ${plaidItemId}`);
  }

  if (item.deletedAt) {
    logger.info('Skipping sync for deleted PlaidItem', { plaidItemId });
    return { added: 0, modified: 0, removed: 0 };
  }

  let accessToken: string;
  try {
    accessToken = decryptAccessToken(item.accessTokenCiphertext);
  } catch (err) {
    logger.error('Failed to decrypt access token for PlaidItem', {
      plaidItemId,
      error: (err as Error).message,
    });
    await prisma.plaidItem.update({
      where: { id: plaidItemId },
      data: {
        status: 'ERROR',
        errorCode: 'CRYPTO_ERROR',
        errorMessage: 'Failed to decrypt access token',
      },
    });
    throw err;
  }

  // Map plaidAccountId -> internal bankAccount.id (denormalized userId too)
  const accountIdByPlaid = new Map(item.accounts.map((a) => [a.plaidAccountId, a.id]));

  let cursor = item.cursor ?? undefined;
  let hasMore = true;
  let totalAdded = 0;
  let totalModified = 0;
  let totalRemoved = 0;

  // Hard cap to defend against pathological loops
  const MAX_PAGES = 100;
  let pages = 0;

  try {
    while (hasMore && pages < MAX_PAGES) {
      pages += 1;
      const page = await transactionsSync(accessToken, cursor);

      await prisma.$transaction(async (tx) => {
        // Upsert added
        for (const t of page.added) {
          const accountId = accountIdByPlaid.get(t.account_id);
          if (!accountId) {
            logger.warn('Transaction account_id not found in linked accounts', {
              plaidItemId,
              accountId: t.account_id,
            });
            continue;
          }
          const data = mapTransactionToData(t, item.userId, accountId);
          await tx.transaction.upsert({
            where: { plaidTransactionId: t.transaction_id },
            create: data,
            update: data,
          });
        }

        // Upsert modified
        for (const t of page.modified) {
          const accountId = accountIdByPlaid.get(t.account_id);
          if (!accountId) continue;
          const data = mapTransactionToData(t, item.userId, accountId);
          await tx.transaction.upsert({
            where: { plaidTransactionId: t.transaction_id },
            create: data,
            update: data,
          });
        }

        // Hard-delete removed (Plaid considers them gone)
        if (page.removed.length > 0) {
          await tx.transaction.deleteMany({
            where: {
              userId: item.userId,
              plaidTransactionId: {
                in: page.removed
                  .map((r) => r.transaction_id)
                  .filter((id): id is string => typeof id === 'string'),
              },
            },
          });
        }

        // Persist cursor + lastSyncAt
        await tx.plaidItem.update({
          where: { id: plaidItemId },
          data: {
            cursor: page.nextCursor,
            lastSyncAt: new Date(),
            // If we recovered from a prior error, mark active again
            status: 'ACTIVE',
            errorCode: null,
            errorMessage: null,
          },
        });
      });

      totalAdded += page.added.length;
      totalModified += page.modified.length;
      totalRemoved += page.removed.length;
      cursor = page.nextCursor;
      hasMore = page.hasMore;

      // QA5: write a per-page audit row so that, if the loop crashes mid-way,
      // we still have an audit trail for every page that was actually
      // committed. The terminal "summary" log below covers the full run.
      await writeAccessLog({
        userId: item.userId,
        actorUserId: item.userId,
        action: 'SYNC',
        resource: 'PlaidItem',
        resourceId: plaidItemId,
        context: {
          pageIndex: pages,
          pageCounts: {
            added: page.added.length,
            modified: page.modified.length,
            removed: page.removed.length,
          },
        },
      });
    }
  } catch (err) {
    if (err instanceof PlaidError) {
      const status =
        err.code === 'ITEM_LOGIN_REQUIRED' ? 'LOGIN_REQUIRED' : 'ERROR';
      await prisma.plaidItem.update({
        where: { id: plaidItemId },
        data: {
          status,
          errorCode: err.code,
          errorMessage: err.message,
        },
      });
    }
    throw err;
  }

  await writeAccessLog({
    userId: item.userId,
    actorUserId: item.userId,
    action: 'SYNC',
    resource: 'PlaidItem',
    resourceId: plaidItemId,
    context: {
      added: totalAdded,
      modified: totalModified,
      removed: totalRemoved,
      pages,
    },
  });

  return { added: totalAdded, modified: totalModified, removed: totalRemoved };
}

function mapTransactionToData(
  t: PlaidTransaction,
  userId: string,
  bankAccountId: string,
): Prisma.TransactionUncheckedCreateInput {
  const pfc = t.personal_finance_category;
  const date = new Date(t.date);
  const authorizedDate = t.authorized_date ? new Date(t.authorized_date) : undefined;

  return {
    userId,
    bankAccountId,
    plaidTransactionId: t.transaction_id,
    plaidPendingId: t.pending_transaction_id ?? undefined,
    amount: new Prisma.Decimal(t.amount.toString()),
    isoCurrencyCode: t.iso_currency_code ?? t.unofficial_currency_code ?? 'USD',
    date,
    authorizedDate,
    name: t.name?.slice(0, 500) ?? '',
    merchantName: t.merchant_name ?? undefined,
    merchantLogoUrl: t.logo_url ?? undefined,
    category: pfc?.primary?.slice(0, 80) ?? t.category?.[0]?.slice(0, 80) ?? undefined,
    categoryDetailed: pfc?.detailed?.slice(0, 120) ?? t.category?.join('/').slice(0, 120) ?? undefined,
    paymentChannel: t.payment_channel ?? undefined,
    pending: !!t.pending,
    isoLocationCity: t.location?.city ?? undefined,
    isoLocationRegion: t.location?.region ?? undefined,
    isoLocationCountry: t.location?.country ?? undefined,
  };
}
