import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Express } from 'express';
import request from 'supertest';

// ── Mock Prisma ─────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};

vi.mock('../config/prisma', () => ({
  prisma: mockPrisma,
}));

// ── Mock logger ─────────────────────────────────────────────────────

vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Mock env ────────────────────────────────────────────────────────

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    JWT_PRIVATE_KEY: '',
    JWT_PUBLIC_KEY: '',
    ANTHROPIC_API_KEY: 'test-key',
    DATABASE_URL: 'postgresql://test',
    ALLOWED_ORIGINS: 'http://localhost:3000',
    APP_URL: 'http://localhost:3000',
    RATE_LIMIT_WINDOW_MS: 900000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    AUTH_RATE_LIMIT_MAX: 100,
  },
}));

// ── Mock rate limiter ───────────────────────────────────────────────

vi.mock('../middleware/rateLimiter', () => ({
  authLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  globalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// ── Mock bcryptjs ───────────────────────────────────────────────────

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$12$hashedpassword'),
    compare: vi.fn(),
  },
}));

// ── Mock jose ───────────────────────────────────────────────────────

const mockSign = vi.fn().mockResolvedValue('mock-jwt-access-token');
const mockSignJWT = vi.fn().mockReturnValue({
  setProtectedHeader: vi.fn().mockReturnValue({
    setIssuedAt: vi.fn().mockReturnValue({
      setExpirationTime: vi.fn().mockReturnValue({
        setIssuer: vi.fn().mockReturnValue({
          setAudience: vi.fn().mockReturnValue({
            sign: mockSign,
          }),
        }),
      }),
    }),
  }),
});

vi.mock('jose', () => ({
  SignJWT: vi.fn().mockImplementation((...args: unknown[]) => mockSignJWT(...args)),
  importPKCS8: vi.fn().mockResolvedValue('mock-private-key'),
  importSPKI: vi.fn().mockResolvedValue('mock-public-key'),
  jwtVerify: vi.fn(),
}));

// ── Import modules after mocks ──────────────────────────────────────

const bcrypt = (await import('bcryptjs')).default;
const { jwtVerify } = await import('jose');

// ── App setup helper ────────────────────────────────────────────────

async function createApp(): Promise<Express> {
  const app = express();
  app.use(express.json());

  const authRoutes = (await import('../routes/auth')).default;
  app.use('/api/auth', authRoutes);

  const { errorHandler } = await import('../middleware/errorHandler');
  app.use(errorHandler);

  return app;
}

// ── Test data ───────────────────────────────────────────────────────

const validRegisterBody = {
  email: 'john@example.com',
  password: 'StrongPass1',
  name: 'John Doe',
};

const mockUser = {
  id: 'user-123',
  email: 'john@example.com',
  name: 'John Doe',
  avatarUrl: null,
  plan: 'FREE',
  onboardingComplete: false,
  createdAt: new Date('2025-01-01'),
};

// ── Tests ───────────────────────────────────────────────────────────

describe('Auth Routes', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.refreshToken.create.mockResolvedValue({
      id: 'rt-1',
      tokenHash: '$2a$10$refreshhash',
      userId: 'user-123',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      revoked: false,
    });
    app = await createApp();
  });

  // ────────────────────────────────────────────────────────
  // POST /api/auth/register
  // ────────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('returns 201 on successful registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null); // no existing user
      mockPrisma.user.create.mockResolvedValueOnce(mockUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send(validRegisterBody)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('john@example.com');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.name).toBe('John Doe');
    });

    it('returns 409 when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser); // existing user

      const res = await request(app)
        .post('/api/auth/register')
        .send(validRegisterBody)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('returns 400 when password is too weak (no uppercase)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weakpass1',
          name: 'Test',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Ab1',
          name: 'Test',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when password has no number', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'WeakPassword',
          name: 'Test',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when email is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'StrongPass1',
          name: 'Test',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'StrongPass1',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────
  // POST /api/auth/login
  // ────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('returns 200 on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        passwordHash: '$2a$12$hashedpassword',
      });
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john@example.com', password: 'StrongPass1' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('john@example.com');
      expect(res.body.data.accessToken).toBeDefined();
      // passwordHash should not be returned
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('returns 401 when password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        passwordHash: '$2a$12$hashedpassword',
      });
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john@example.com', password: 'WrongPass1' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 401 when email is not registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'StrongPass1' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 400 when email format is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bad-email', password: 'StrongPass1' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when password is empty', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john@example.com', password: '' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────
  // GET /api/auth/me
  // ────────────────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    it('returns 200 with user data when token is valid', async () => {
      (jwtVerify as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        payload: { sub: 'user-123' },
        protectedHeader: { alg: 'RS256' },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer mock-jwt-access-token')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe('user-123');
      expect(res.body.data.user.email).toBe('john@example.com');
      expect(res.body.data.user.name).toBe('John Doe');
    });

    it('returns 401 when no authorization header is present', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 when token is invalid', async () => {
      (jwtVerify as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Invalid token'),
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 when Authorization header has wrong scheme', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Basic some-credentials')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('returns 404 when token is valid but user not found in database', async () => {
      (jwtVerify as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        payload: { sub: 'deleted-user-999' },
        protectedHeader: { alg: 'RS256' },
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer mock-jwt-access-token')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });
  });
});
