import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../config/env';

// ── Errors ─────────────────────────────────────────────────────────

export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoError';
  }
}

// ── Constants ─────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard IV length
const AUTH_TAG_LENGTH = 16;
const VERSION_PREFIX_DELIMITER = ':';

// ── Key handling ───────────────────────────────────────────────────

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  if (!env.ENCRYPTION_KEY || !/^[0-9a-f]{64}$/.test(env.ENCRYPTION_KEY)) {
    throw new CryptoError('ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  }

  cachedKey = Buffer.from(env.ENCRYPTION_KEY, 'hex');

  if (cachedKey.length !== 32) {
    throw new CryptoError('ENCRYPTION_KEY must decode to 32 bytes');
  }

  return cachedKey;
}

/**
 * Test-only: reset the cached key so that a new ENCRYPTION_KEY is picked up.
 */
export function _resetCryptoKeyCache(): void {
  cachedKey = null;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Encrypt a plaintext string (typically a Plaid access_token) using AES-256-GCM.
 * Output format: `v<version>:<base64(iv ‖ authTag ‖ ciphertext)>`.
 *
 * The `version` prefix lets us rotate `ENCRYPTION_KEY` without re-encrypting
 * everything in a single migration: future versions can route based on prefix.
 */
export function encryptAccessToken(plaintext: string, version?: number): string {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new CryptoError('Cannot encrypt empty plaintext');
  }

  const v = version ?? env.ENCRYPTION_KEY_VERSION ?? 1;
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const packed = Buffer.concat([iv, authTag, ciphertext]).toString('base64');
  return `v${v}${VERSION_PREFIX_DELIMITER}${packed}`;
}

/**
 * Decrypt a ciphertext produced by `encryptAccessToken`.
 * Throws `CryptoError` on auth-tag mismatch (tampering / wrong key).
 *
 * NOTE: never include `ciphertext` or the resulting plaintext in error messages
 * or logs — error messages are intentionally generic.
 */
export function decryptAccessToken(ciphertext: string): string {
  if (typeof ciphertext !== 'string' || ciphertext.length === 0) {
    throw new CryptoError('Cannot decrypt empty ciphertext');
  }

  let payloadB64 = ciphertext;
  if (ciphertext.startsWith('v')) {
    const idx = ciphertext.indexOf(VERSION_PREFIX_DELIMITER);
    if (idx === -1) {
      throw new CryptoError('Malformed ciphertext: missing version delimiter');
    }
    // versionStr is parsed for forward-compat; current implementation has only v1.
    payloadB64 = ciphertext.slice(idx + 1);
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(payloadB64, 'base64');
  } catch {
    throw new CryptoError('Malformed ciphertext: not valid base64');
  }

  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new CryptoError('Malformed ciphertext: too short');
  }

  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ct = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
    return plaintext.toString('utf8');
  } catch {
    // Generic error — never expose ciphertext or key material.
    throw new CryptoError('Decryption failed: auth tag mismatch or invalid ciphertext');
  }
}
