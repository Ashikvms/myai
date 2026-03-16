import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Express } from 'express';
import request from 'supertest';

// ── Mock Prisma ─────────────────────────────────────────────────────

const mockPrisma = {
  task: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
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
  },
}));

// ── Mock auth middleware to inject a test user ──────────────────────

const TEST_USER_ID = 'user-abc-123';
const OTHER_USER_ID = 'user-other-456';

vi.mock('../middleware/auth', () => ({
  requireAuth: (req: { user: { userId: string } }, _res: unknown, next: () => void) => {
    // Default to the test user; tests can override via custom header
    const userIdOverride = (req as unknown as { headers: Record<string, string> }).headers[
      'x-test-user-id'
    ];
    req.user = { userId: userIdOverride || TEST_USER_ID };
    next();
  },
}));

// ── Import modules after mocks ──────────────────────────────────────

// ── App setup helper ────────────────────────────────────────────────

async function createApp(): Promise<Express> {
  const app = express();
  app.use(express.json());

  const tasksRouter = (await import('../routes/tasks')).default;
  app.use('/api/tasks', tasksRouter);

  // Simple error handler for tests
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(500).json({ success: false, error: { message: err.message } });
    },
  );

  return app;
}

// ── Test data ───────────────────────────────────────────────────────

const mockTask = {
  id: 'task-1',
  title: 'Buy groceries',
  notes: 'Milk, eggs, bread',
  dueDate: new Date('2025-06-01T00:00:00Z'),
  category: 'PERSONAL',
  priority: 'MEDIUM',
  status: 'PENDING',
  isRecurring: false,
  recurrenceRule: null,
  userId: TEST_USER_ID,
  createdAt: new Date('2025-05-15'),
  updatedAt: new Date('2025-05-15'),
  completedAt: null,
  deletedAt: null,
};

const mockTask2 = {
  ...mockTask,
  id: 'task-2',
  title: 'Pay rent',
  category: 'FINANCE',
  priority: 'HIGH',
};

// ── Tests ───────────────────────────────────────────────────────────

describe('Tasks Routes', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createApp();
  });

  // ────────────────────────────────────────────────────────
  // GET /api/tasks
  // ────────────────────────────────────────────────────────

  describe('GET /api/tasks', () => {
    it('returns all tasks for the authenticated user', async () => {
      mockPrisma.task.findMany.mockResolvedValueOnce([mockTask, mockTask2]);

      const res = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].title).toBe('Buy groceries');
      expect(res.body.data[1].title).toBe('Pay rent');

      // Verify Prisma was called with correct userId filter
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: TEST_USER_ID,
            deletedAt: null,
          }),
        }),
      );
    });

    it('returns empty array when user has no tasks', async () => {
      mockPrisma.task.findMany.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('filters tasks by status query parameter', async () => {
      mockPrisma.task.findMany.mockResolvedValueOnce([
        { ...mockTask, status: 'COMPLETED' },
      ]);

      await request(app)
        .get('/api/tasks?status=COMPLETED')
        .expect(200);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
          }),
        }),
      );
    });

    it('filters tasks by priority query parameter', async () => {
      mockPrisma.task.findMany.mockResolvedValueOnce([mockTask2]);

      await request(app)
        .get('/api/tasks?priority=HIGH')
        .expect(200);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: 'HIGH',
          }),
        }),
      );
    });

    it('filters tasks by category query parameter', async () => {
      mockPrisma.task.findMany.mockResolvedValueOnce([mockTask]);

      await request(app)
        .get('/api/tasks?category=PERSONAL')
        .expect(200);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'PERSONAL',
          }),
        }),
      );
    });
  });

  // ────────────────────────────────────────────────────────
  // POST /api/tasks
  // ────────────────────────────────────────────────────────

  describe('POST /api/tasks', () => {
    it('creates a task with valid input and returns 201', async () => {
      const newTask = {
        title: 'File tax return',
        notes: 'Deadline approaching',
        dueDate: '2025-07-15T00:00:00.000Z',
        category: 'FINANCE',
        priority: 'HIGH',
      };

      mockPrisma.task.create.mockResolvedValueOnce({
        id: 'task-new',
        ...newTask,
        dueDate: new Date(newTask.dueDate),
        status: 'PENDING',
        isRecurring: false,
        recurrenceRule: null,
        userId: TEST_USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        deletedAt: null,
      });

      const res = await request(app)
        .post('/api/tasks')
        .send(newTask)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('File tax return');
      expect(res.body.data.userId).toBe(TEST_USER_ID);

      // Verify create was called with the user's ID
      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'File tax return',
            userId: TEST_USER_ID,
          }),
        }),
      );
    });

    it('creates a task with only the required title field', async () => {
      mockPrisma.task.create.mockResolvedValueOnce({
        id: 'task-minimal',
        title: 'Quick task',
        priority: 'MEDIUM',
        isRecurring: false,
        status: 'PENDING',
        userId: TEST_USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Quick task' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Quick task');
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ notes: 'No title provided' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when title is empty string', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: '' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when priority is invalid', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'A task', priority: 'SUPER_HIGH' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when dueDate is not a valid datetime', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'A task', dueDate: 'not-a-date' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ────────────────────────────────────────────────────────
  // PUT /api/tasks/:id
  // ────────────────────────────────────────────────────────

  describe('PUT /api/tasks/:id', () => {
    it('updates a task with valid input', async () => {
      mockPrisma.task.findFirst.mockResolvedValueOnce(mockTask);
      mockPrisma.task.update.mockResolvedValueOnce({
        ...mockTask,
        title: 'Buy organic groceries',
        priority: 'HIGH',
      });

      const res = await request(app)
        .put('/api/tasks/task-1')
        .send({ title: 'Buy organic groceries', priority: 'HIGH' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Buy organic groceries');
      expect(res.body.data.priority).toBe('HIGH');
    });

    it('updates task status to COMPLETED', async () => {
      mockPrisma.task.findFirst.mockResolvedValueOnce(mockTask);
      mockPrisma.task.update.mockResolvedValueOnce({
        ...mockTask,
        status: 'COMPLETED',
      });

      const res = await request(app)
        .put('/api/tasks/task-1')
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');
    });

    it('returns 404 when task does not exist', async () => {
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);

      const res = await request(app)
        .put('/api/tasks/nonexistent-id')
        .send({ title: 'Updated' })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 400 with invalid status value', async () => {
      const res = await request(app)
        .put('/api/tasks/task-1')
        .send({ status: 'INVALID_STATUS' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('scopes the lookup to the authenticated user', async () => {
      mockPrisma.task.findFirst.mockResolvedValueOnce(mockTask);
      mockPrisma.task.update.mockResolvedValueOnce({ ...mockTask, title: 'Updated' });

      await request(app)
        .put('/api/tasks/task-1')
        .send({ title: 'Updated' })
        .expect(200);

      expect(mockPrisma.task.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'task-1',
            userId: TEST_USER_ID,
            deletedAt: null,
          }),
        }),
      );
    });
  });

  // ────────────────────────────────────────────────────────
  // DELETE /api/tasks/:id
  // ────────────────────────────────────────────────────────

  describe('DELETE /api/tasks/:id', () => {
    it('soft deletes a task (sets deletedAt)', async () => {
      mockPrisma.task.findFirst.mockResolvedValueOnce(mockTask);
      mockPrisma.task.update.mockResolvedValueOnce({
        ...mockTask,
        deletedAt: new Date(),
      });

      const res = await request(app)
        .delete('/api/tasks/task-1')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Task deleted');

      // Verify it was a soft delete (update with deletedAt), not a hard delete
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-1' },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('returns 404 when task does not exist', async () => {
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);

      const res = await request(app)
        .delete('/api/tasks/nonexistent-id')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when task belongs to another user', async () => {
      // findFirst returns null because userId doesn't match
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);

      const res = await request(app)
        .delete('/api/tasks/task-1')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when task is already soft-deleted', async () => {
      // findFirst with deletedAt: null won't find already-deleted tasks
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);

      const res = await request(app)
        .delete('/api/tasks/task-1')
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────
  // Auth scoping
  // ────────────────────────────────────────────────────────

  describe('Auth scoping', () => {
    it('GET /api/tasks filters by the authenticated userId', async () => {
      mockPrisma.task.findMany.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/tasks')
        .expect(200);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: TEST_USER_ID,
          }),
        }),
      );
    });

    it('POST /api/tasks assigns the task to the authenticated user', async () => {
      mockPrisma.task.create.mockResolvedValueOnce({
        id: 'task-scoped',
        title: 'Scoped task',
        userId: TEST_USER_ID,
        status: 'PENDING',
        priority: 'MEDIUM',
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await request(app)
        .post('/api/tasks')
        .send({ title: 'Scoped task' })
        .expect(201);

      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: TEST_USER_ID,
          }),
        }),
      );
    });

    it('GET /api/tasks uses a different userId when header is overridden', async () => {
      mockPrisma.task.findMany.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/tasks')
        .set('X-Test-User-Id', OTHER_USER_ID)
        .expect(200);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: OTHER_USER_ID,
          }),
        }),
      );
    });

    it('DELETE /api/tasks/:id scopes lookup by userId', async () => {
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);

      await request(app)
        .delete('/api/tasks/task-1')
        .expect(404);

      expect(mockPrisma.task.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: TEST_USER_ID,
            deletedAt: null,
          }),
        }),
      );
    });
  });
});
