import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { logger } from '../config/logger';

const UPLOAD_EXPIRY = 300; // 5 minutes
const DOWNLOAD_EXPIRY = 900; // 15 minutes

function createR2Client(): S3Client | null {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    logger.warn('R2 credentials not configured — file storage disabled');
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

const s3 = createR2Client();
const BUCKET = env.R2_BUCKET_NAME || 'lifeadmin-documents';

export async function getPresignedUploadUrl(
  key: string,
  mimeType: string,
  fileSizeBytes: number,
): Promise<{ url: string; key: string }> {
  if (!s3) {
    throw new Error('File storage not configured');
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: mimeType,
    ContentLength: fileSizeBytes,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: UPLOAD_EXPIRY });

  logger.info('Presigned upload URL generated', { key, mimeType });

  return { url, key };
}

export async function getPresignedDownloadUrl(
  key: string,
): Promise<string> {
  if (!s3) {
    throw new Error('File storage not configured');
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: DOWNLOAD_EXPIRY });

  return url;
}

export async function deleteFile(key: string): Promise<void> {
  if (!s3) {
    throw new Error('File storage not configured');
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await s3.send(command);

  logger.info('File deleted from R2', { key });
}
