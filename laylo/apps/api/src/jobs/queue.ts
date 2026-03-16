import { Queue, Worker } from 'bullmq';
import { redis, isRedisAvailable } from '../config/redis';
import { logger } from '../config/logger';
import {
  checkDueBills,
  checkExpiringDocs,
  checkDueReminders,
  generateDailyInsights,
} from './handlers';

const QUEUE_NAME = 'life-admin-jobs';

enum JobType {
  CHECK_DUE_BILLS = 'CHECK_DUE_BILLS',
  CHECK_EXPIRING_DOCS = 'CHECK_EXPIRING_DOCS',
  CHECK_DUE_REMINDERS = 'CHECK_DUE_REMINDERS',
  GENERATE_DAILY_INSIGHTS = 'GENERATE_DAILY_INSIGHTS',
}

let queue: Queue | null = null;
let worker: Worker | null = null;

async function processJob(jobType: string): Promise<void> {
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
    default:
      logger.warn('Unknown job type', { jobType });
  }
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
        await processJob(job.name);
        logger.info('Job completed', { id: job.id, type: job.name });
      },
      {
        connection: connection,
        concurrency: 1,
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
