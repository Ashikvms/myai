import bcrypt from 'bcryptjs';
import { SignJWT, importPKCS8, importSPKI, jwtVerify, type KeyLike } from 'jose';
import crypto from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../config/prisma';

// ── Schemas ────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(1, 'Name is required').max(100),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ── Key helpers ────────────────────────

function decodeBase64Pem(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('utf-8');
}

let _privateKey: KeyLike | null = null;
let _publicKey: KeyLike | null = null;

async function getPrivateKey(): Promise<KeyLike> {
  if (!_privateKey) {
    const pem = decodeBase64Pem(env.JWT_PRIVATE_KEY);
    _privateKey = await importPKCS8(pem, 'RS256');
  }
  return _privateKey;
}

async function getPublicKey(): Promise<KeyLike> {
  if (!_publicKey) {
    const pem = decodeBase64Pem(env.JWT_PUBLIC_KEY);
    _publicKey = await importSPKI(pem, 'RS256');
  }
  return _publicKey;
}

// ── Password utilities ─────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── Token generation ───────────────────

export async function generateAccessToken(userId: string): Promise<string> {
  const privateKey = await getPrivateKey();
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .setIssuer('life-admin-api')
    .setAudience('life-admin')
    .sign(privateKey);
}

export async function generateRefreshToken(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(48).toString('hex');
  const tokenHash = await bcrypt.hash(token, 10);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

// ── Token verification ─────────────────

export async function verifyAccessToken(token: string): Promise<{ userId: string }> {
  const publicKey = await getPublicKey();
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: 'life-admin-api',
    audience: 'life-admin',
  });

  if (!payload.sub) {
    throw new Error('Invalid token: missing subject');
  }

  return { userId: payload.sub };
}

// ── Refresh token rotation ─────────────

export async function rotateRefreshToken(
  oldToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  // Find all non-revoked, non-expired refresh tokens
  const storedTokens = await prisma.refreshToken.findMany({
    where: {
      revoked: false,
      expiresAt: { gt: new Date() },
    },
  });

  // Find the matching token by comparing hashes
  let matchedToken: (typeof storedTokens)[number] | null = null;
  for (const stored of storedTokens) {
    const isMatch = await bcrypt.compare(oldToken, stored.tokenHash);
    if (isMatch) {
      matchedToken = stored;
      break;
    }
  }

  if (!matchedToken) {
    throw new AuthError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  // Revoke the old token
  await prisma.refreshToken.update({
    where: { id: matchedToken.id },
    data: { revoked: true },
  });

  // Issue new pair
  const accessToken = await generateAccessToken(matchedToken.userId);
  const { token: refreshToken } = await generateRefreshToken(matchedToken.userId);

  return { accessToken, refreshToken };
}

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revoked: true },
  });
}

// ── Auth error class ───────────────────

export class AuthError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// ── Register ───────────────────────────

export async function register(input: RegisterInput) {
  const validated = registerSchema.parse(input);

  const existing = await prisma.user.findUnique({
    where: { email: validated.email.toLowerCase() },
  });

  if (existing) {
    throw new AuthError('An account with this email already exists', 'EMAIL_EXISTS', 409);
  }

  const passwordHash = await hashPassword(validated.password);

  const user = await prisma.user.create({
    data: {
      email: validated.email.toLowerCase(),
      passwordHash,
      name: validated.name,
      notificationPref: {
        create: {},
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      plan: true,
      onboardingComplete: true,
      createdAt: true,
    },
  });

  const accessToken = await generateAccessToken(user.id);
  const { token: refreshToken } = await generateRefreshToken(user.id);

  logger.info('User registered', { userId: user.id });

  return { user, accessToken, refreshToken };
}

// ── Login ──────────────────────────────

export async function login(input: LoginInput) {
  const validated = loginSchema.parse(input);

  const user = await prisma.user.findUnique({
    where: { email: validated.email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      plan: true,
      onboardingComplete: true,
      createdAt: true,
      passwordHash: true,
    },
  });

  if (!user || !user.passwordHash) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const valid = await verifyPassword(validated.password, user.passwordHash);
  if (!valid) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const accessToken = await generateAccessToken(user.id);
  const { token: refreshToken } = await generateRefreshToken(user.id);

  logger.info('User logged in', { userId: user.id });

  const { passwordHash: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, accessToken, refreshToken };
}

// ── Google OAuth login ─────────────────

export async function loginWithGoogle(profile: {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}) {
  let user = await prisma.user.findUnique({
    where: { googleId: profile.googleId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      plan: true,
      onboardingComplete: true,
      createdAt: true,
    },
  });

  if (!user) {
    // Check if a user with this email exists (link accounts)
    const existingByEmail = await prisma.user.findUnique({
      where: { email: profile.email.toLowerCase() },
    });

    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId: profile.googleId,
          avatarUrl: profile.avatarUrl ?? existingByEmail.avatarUrl,
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          plan: true,
          onboardingComplete: true,
          createdAt: true,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: profile.email.toLowerCase(),
          name: profile.name,
          googleId: profile.googleId,
          avatarUrl: profile.avatarUrl,
          notificationPref: {
            create: {},
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          plan: true,
          onboardingComplete: true,
          createdAt: true,
        },
      });
    }
  }

  const accessToken = await generateAccessToken(user.id);
  const { token: refreshToken } = await generateRefreshToken(user.id);

  logger.info('User logged in with Google', { userId: user.id });

  return { user, accessToken, refreshToken };
}
