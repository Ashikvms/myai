import { describe, it, expect, vi, beforeEach } from 'vitest';

// Two distinct 64-hex keys for cross-key tests
const KEY_A = 'a'.repeat(64);
const KEY_B = 'b'.repeat(64);

let currentKey = KEY_A;
let currentVersion = 1;

vi.mock('../config/env', () => ({
  get env() {
    return {
      ENCRYPTION_KEY: currentKey,
      ENCRYPTION_KEY_VERSION: currentVersion,
    };
  },
}));

describe('crypto', () => {
  beforeEach(async () => {
    currentKey = KEY_A;
    currentVersion = 1;
    const mod = await import('../services/crypto');
    mod._resetCryptoKeyCache();
  });

  it('round-trips a plaintext through encrypt/decrypt', async () => {
    const { encryptAccessToken, decryptAccessToken } = await import('../services/crypto');
    const plaintext = 'access-sandbox-1234567890abcdef';
    const ct = encryptAccessToken(plaintext);
    expect(ct).not.toContain(plaintext);
    expect(decryptAccessToken(ct)).toBe(plaintext);
  });

  it('produces different ciphertexts for the same input (random IV)', async () => {
    const { encryptAccessToken } = await import('../services/crypto');
    const plaintext = 'same-input';
    const a = encryptAccessToken(plaintext);
    const b = encryptAccessToken(plaintext);
    expect(a).not.toBe(b);
  });

  it('embeds the key version in the ciphertext prefix', async () => {
    const { encryptAccessToken } = await import('../services/crypto');
    const ct = encryptAccessToken('hello', 7);
    expect(ct.startsWith('v7:')).toBe(true);
  });

  it('rejects tampered ciphertext (auth tag mismatch)', async () => {
    const { encryptAccessToken, decryptAccessToken, CryptoError } = await import(
      '../services/crypto'
    );
    const ct = encryptAccessToken('secret-token');
    // Flip a few bytes inside the base64 payload
    const idx = ct.indexOf(':');
    const payload = ct.slice(idx + 1);
    const buf = Buffer.from(payload, 'base64');
    const lastIdx = buf.length - 1;
    buf[lastIdx] = (buf[lastIdx] ?? 0) ^ 0xff;
    const tampered = `${ct.slice(0, idx + 1)}${buf.toString('base64')}`;
    expect(() => decryptAccessToken(tampered)).toThrow(CryptoError);
  });

  it('rejects ciphertext encrypted with a different key', async () => {
    const cryptoMod = await import('../services/crypto');

    // Encrypt with KEY_A
    currentKey = KEY_A;
    cryptoMod._resetCryptoKeyCache();
    const ct = cryptoMod.encryptAccessToken('with-key-a');

    // Switch key, drop cache, attempt to decrypt
    currentKey = KEY_B;
    cryptoMod._resetCryptoKeyCache();
    expect(() => cryptoMod.decryptAccessToken(ct)).toThrow(cryptoMod.CryptoError);
  });

  it('throws on empty input', async () => {
    const { encryptAccessToken, decryptAccessToken, CryptoError } = await import(
      '../services/crypto'
    );
    expect(() => encryptAccessToken('')).toThrow(CryptoError);
    expect(() => decryptAccessToken('')).toThrow(CryptoError);
  });

  it('throws on malformed (too-short) ciphertext', async () => {
    const { decryptAccessToken, CryptoError } = await import('../services/crypto');
    expect(() => decryptAccessToken('v1:short')).toThrow(CryptoError);
  });
});
