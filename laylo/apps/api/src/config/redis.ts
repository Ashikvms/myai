import IORedis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export let isRedisAvailable = false;

function createRedisConnection(): IORedis {
  if (!env.REDIS_URL) {
    logger.warn('REDIS_URL not configured — Redis features disabled');
    // Return a dummy instance that won't connect
    const dummy = new IORedis({ lazyConnect: true, maxRetriesPerRequest: 0 });
    return dummy;
  }

  const connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 3) {
        logger.warn('Redis connection failed after 3 retries — giving up');
        return null;
      }
      return Math.min(times * 500, 3000);
    },
  });

  connection.on('connect', () => {
    isRedisAvailable = true;
    logger.info('Redis connected');
  });

  connection.on('error', (err) => {
    isRedisAvailable = false;
    logger.warn('Redis connection error', { error: err.message });
  });

  connection.on('close', () => {
    isRedisAvailable = false;
  });

  return connection;
}

export const redis = createRedisConnection();
