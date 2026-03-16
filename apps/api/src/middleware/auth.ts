import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { verifyAccessToken } from '../services/auth';

// ── Type augmentation ──────────────────

export interface AuthUser {
  userId: string;
  email?: string;
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AuthUser {
      // Google OAuth fields (set during OAuth callback)
      googleId?: string;
      name?: string;
      avatarUrl?: string;
    }
  }
}

// ── Middleware ──────────────────────────

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
      });
      return;
    }

    const token = authHeader.slice(7);
    const { userId } = await verifyAccessToken(token);

    req.user = { userId };
    next();
  } catch (error) {
    logger.debug('Auth middleware rejected request', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token' },
    });
  }
}
