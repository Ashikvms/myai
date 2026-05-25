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
  googleCalendarSyncAll,
  googleCalendarSyncUser,
  googleCalendarPushAppointment,
  googleCalendarDeleteAppointment,
  gmailPollingSyncAll,
  gmailPollingSyncUser,
  gmailInboxTriage,
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
  // ── Google integrations ─────────────
  GOOGLE_CALENDAR_SYNC = 'GOOGLE_CALENDAR_SYNC',
  GOOGLE_CALENDAR_SYNC_USER = 'GOOGLE_CALENDAR_SYNC_USER',
  GOOGLE_CALENDAR_PUSH_APPOINTMENT = 'GOOGLE_CALENDAR_PUSH_APPOINTMENT',
  GOOGLE_CALENDAR_DELETE_APPOINTMENT = 'GOOGLE_CALENDAR_DELETE_APPOINTMENT',
  GMAIL_POLLING_SYNC = 'GMAIL_POLLING_SYNC',
  GMAIL_POLLING_SYNC_USER = 'GMAIL_POLLING_SYNC_USER',
  INBOX_TRIAGE = 'INBOX_TRIAGE',
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
    case JobType.GOOGLE_CALENDAR_SYNC:
      await googleCalendarSyncAll();
      break;
    case JobType.GOOGLE_CALENDAR_SYNC_USER: {
      const { userId } = (data as { userId?: string }) ?? {};
      if (!userId) throw new Error('GOOGLE_CALENDAR_SYNC_USER: missing userId');
      await googleCalendarSyncUser(userId);
      break;
    }
    case JobType.GOOGLE_CALENDAR_PUSH_APPOINTMENT: {
      const { appointmentId } = (data as { appointmentId?: string }) ?? {};
      if (!appointmentId) throw new Error('GOOGLE_CALENDAR_PUSH_APPOINTMENT: missing appointmentId');
      await googleCalendarPushAppointment(appointmentId);
      break;
    }
    case JobType.GOOGLE_CALENDAR_DELETE_APPOINTMENT: {
      const { appointmentId } = (data as { appointmentId?: string }) ?? {};
      if (!appointmentId) throw new Error('GOOGLE_CALENDAR_DELETE_APPOINTMENT: missing appointmentId');
      await googleCalendarDeleteAppointment(appointmentId);
      break;
    }
    case JobType.GMAIL_POLLING_SYNC:
      await gmailPollingSyncAll();
      break;
    case JobType.GMAIL_POLLING_SYNC_USER: {
      const { userId } = (data as { userId?: string }) ?? {};
      if (!userId) throw new Error('GMAIL_POLLING_SYNC_USER: missing userId');
      await gmailPollingSyncUser(userId);
      break;
    }
    case JobType.INBOX_TRIAGE:
      await gmailInboxTriage();
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

/**
 * Enqueue a Google integration job. Mirrors `enqueuePlaidJob` — returns
 * null when Redis is down so callers never block on Google sync.
 */
export async function enqueueGoogleJob(
  jobType:
    | JobType.GOOGLE_CALENDAR_SYNC
    | JobType.GOOGLE_CALENDAR_SYNC_USER
    | JobType.GOOGLE_CALENDAR_PUSH_APPOINTMENT
    | JobType.GOOGLE_CALENDAR_DELETE_APPOINTMENT
    | JobType.GMAIL_POLLING_SYNC
    | JobType.GMAIL_POLLING_SYNC_USER
    | JobType.INBOX_TRIAGE,
  data: { userId?: string; appointmentId?: string } = {},
): Promise<Job | null> {
  if (!queue) {
    logger.warn('Queue not running — Google job not enqueued', { jobType });
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

    // ── Google integration schedules ─────────
    // Calendar sync runs daily at 06:00 UTC so we have fresh data before
    // the daily-insights job (07:00) reads it.
    await queue.upsertJobScheduler(
      'google-calendar-sync',
      { pattern: '0 6 * * *' },
      { name: JobType.GOOGLE_CALENDAR_SYNC },
    );

    // Gmail polling runs hourly. AI processing is included in the same
    // job so we don't pay the per-user fan-out cost twice.
    await queue.upsertJobScheduler(
      'gmail-polling-sync',
      { pattern: '0 * * * *' },
      { name: JobType.GMAIL_POLLING_SYNC },
    );

    // Daily inbox triage at 07:00 UTC — after the hourly Gmail poll runs.
    await queue.upsertJobScheduler(
      'gmail-inbox-triage',
      { pattern: '0 7 * * *' },
      { name: JobType.INBOX_TRIAGE },
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
