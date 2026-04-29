import { Queue, Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { redis, isRedisAvailable } from '../config/redis';
import { logger } from '../config/logger';
import {
  checkDueBills,
  checkExpiringDocs,
  checkDueReminders,
  generateDailyInsights,
  plaidInitialSync,
  plaidIncrementalSync,
  plaidRebalance,
  purgeOldWebhookPayloads,
} from './handlers';

const QUEUE_NAME = 'life-admin-jobs';

export enum JobType {
  CHECK_DUE_BILLS = 'CHECK_DUE_BILLS',
  CHECK_EXPIRING_DOCS = 'CHECK_EXPIRING_DOCS',
  CHECK_DUE_REMINDERS = 'CHECK_DUE_REMINDERS',
  GENERATE_DAILY_INSIGHTS = 'GENERATE_DAILY_INSIGHTS',
  PLAID_INITIAL_SYNC = 'PLAID_INITIAL_SYNC',
  PLAID_INCREMENTAL_SYNC = 'PLAID_INCREMENTAL_SYNC',
  PLAID_REBALANCE = 'PLAID_REBALANCE',
  PURGE_OLD_WEBHOOK_PAYLOADS = 'PURGE_OLD_WEBHOOK_PAYLOADS',
}

let queue: Queue | null = null;
let worker: Worker | null = null;

async function processJob(jobType: string, data: unknown): Promise<void> {
  switch (jobType) {
    case JobType.CHECK_DUE_BILLS:
      await checkDueBills();
      break;
    case JobType.CHECK_EXPIRING_DOCS:
      await checkExpiringDocs();
      break;
    case JobType.CHECK_DUE_REMINDERS:
      await checkDueReminders();
      break;
    case JobType.GENERATE_DAILY_INSIGHTS:
      await generateDailyInsights();
      break;
    case JobType.PLAID_INITIAL_SYNC: {
      const { plaidItemId } = (data as { plaidItemId?: string }) ?? {};
      if (!plaidItemId) throw new Error('PLAID_INITIAL_SYNC: missing plaidItemId');
      await plaidInitialSync(plaidItemId);
      break;
    }
    case JobType.PLAID_INCREMENTAL_SYNC: {
      const { plaidItemId } = (data as { plaidItemId?: string }) ?? {};
      if (!plaidItemId) throw new Error('PLAID_INCREMENTAL_SYNC: missing plaidItemId');
      await plaidIncrementalSync(plaidItemId);
      break;
    }
    case JobType.PLAID_REBALANCE:
      await plaidRebalance();
      break;
    case JobType.PURGE_OLD_WEBHOOK_PAYLOADS:
      await purgeOldWebhookPayloads();
      break;
    default:
      logger.warn('Unknown job type', { jobType });
  }
}

/**
 * Enqueue a Plaid job. Returns the BullMQ job, or null if Redis is unavailable.
 * Callers should not block on Plaid syncs.
 */
export async function enqueuePlaidJob(
  jobType:
    | JobType.PLAID_INITIAL_SYNC
    | JobType.PLAID_INCREMENTAL_SYNC
    | JobType.PLAID_REBALANCE,
  data: { plaidItemId?: string } = {},
): Promise<Job | null> {
  if (!queue) {
    logger.warn('Queue not running — Plaid job not enqueued', { jobType });
    return null;
  }
  const job = await queue.add(jobType, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  });
  return job;
}

export async function startJobQueue(): Promise<void> {
  if (!isRedisAvailable) {
    logger.warn('Redis not available — job queue disabled');
    return;
  }

  try {
    const connection = redis as unknown as import('bullmq').ConnectionOptions;

    queue = new Queue(QUEUE_NAME, { connection });

    worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        logger.info('Processing job', { id: job.id, type: job.name });
        await processJob(job.name, job.data);
        logger.info('Job completed', { id: job.id, type: job.name });
      },
      {
        connection: connection,
        concurrency: 3,
      },
    );

    worker.on('failed', (job, err) => {
      logger.error('Job failed', {
        id: job?.id,
        type: job?.name,
        error: err.message,
      });
    });

    worker.on('error', (err) => {
      logger.error('Worker error', { error: err.message });
    });

    // Schedule recurring jobs — upsert to avoid duplicates on restart
    await queue.upsertJobScheduler(
      'check-due-bills',
      { pattern: '0 8 * * *' }, // Daily at 8am UTC
      { name: JobType.CHECK_DUE_BILLS },
    );

    await queue.upsertJobScheduler(
      'check-expiring-docs',
      { pattern: '0 8 * * *' }, // Daily at 8am UTC
      { name: JobType.CHECK_EXPIRING_DOCS },
    );

    await queue.upsertJobScheduler(
      'check-due-reminders',
      { pattern: '*/15 * * * *' }, // Every 15 minutes
      { name: JobType.CHECK_DUE_REMINDERS },
    );

    await queue.upsertJobScheduler(
      'generate-daily-insights',
      { pattern: '0 7 * * *' }, // Daily at 7am UTC
      { name: JobType.GENERATE_DAILY_INSIGHTS },
    );

    await queue.upsertJobScheduler(
      'plaid-rebalance',
      { pattern: '0 6 * * *' }, // Daily at 6am UTC
      { name: JobType.PLAID_REBALANCE },
    );

    // F6: scrub raw webhook payloads older than 30 days nightly so we don't
    // accumulate PII-bearing JSON in the audit trail forever.
    await queue.upsertJobScheduler(
      'purge-old-webhook-payloads',
      { pattern: '0 3 * * *' }, // Daily at 3am UTC
      { name: JobType.PURGE_OLD_WEBHOOK_PAYLOADS },
    );

    logger.info('Job queue started with recurring schedules');
  } catch (err) {
    logger.error('Failed to start job queue', { error: (err as Error).message });
  }
}

export async function stopJobQueue(): Promise<void> {
  try {
    if (worker) {
      await worker.close();
      worker = null;
    }
    if (queue) {
      await queue.close();
      queue = null;
    }
    logger.info('Job queue stopped');
  } catch (err) {
    logger.error('Error stopping job queue', { error: (err as Error).message });
  }
}
