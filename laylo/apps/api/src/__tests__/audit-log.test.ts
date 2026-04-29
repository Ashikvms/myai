import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock prisma ─────────────────────────────────────────────────────

const mockPrisma = {
  bankDataAccessLog: {
    create: vi.fn(),
  },
};
vi.mock('../config/prisma', () => ({ prisma: mockPrisma }));

// ── Mock logger so we can assert on error logs ──────────────────────

const loggerError = vi.fn();
vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: loggerError,
    debug: vi.fn(),
  },
}));

vi.mock('../config/env', () => ({ env: { NODE_ENV: 'test' } }));

describe('audit-log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes a log entry with all fields supplied', async () => {
    mockPrisma.bankDataAccessLog.create.mockResolvedValueOnce({ id: 'log-1' });
    const { writeAccessLog } = await import('../services/audit-log');

    await writeAccessLog({
      userId: 'u-1',
      action: 'LINK',
      resource: 'PlaidItem',
      resourceId: 'pi-1',
      ipAddress: '1.2.3.4',
      userAgent: 'jest',
      context: { stage: 'test' },
    });

    expect(mockPrisma.bankDataAccessLog.create).toHaveBeenCalledOnce();
    const call = mockPrisma.bankDataAccessLog.create.mock.calls[0][0];
    expect(call.data.userId).toBe('u-1');
    expect(call.data.actorUserId).toBe('u-1'); // defaults to userId
    expect(call.data.action).toBe('LINK');
    expect(call.data.resourceId).toBe('pi-1');
  });

  it('uses actorUserId override when provided', async () => {
    mockPrisma.bankDataAccessLog.create.mockResolvedValueOnce({ id: 'log-2' });
    const { writeAccessLog } = await import('../services/audit-log');

    await writeAccessLog({
      userId: 'u-1',
      actorUserId: 'system',
      action: 'SYNC',
      resource: 'PlaidItem',
    });

    const call = mockPrisma.bankDataAccessLog.create.mock.calls[0][0];
    expect(call.data.actorUserId).toBe('system');
  });

  it('never throws when the DB write fails', async () => {
    mockPrisma.bankDataAccessLog.create.mockRejectedValueOnce(new Error('db down'));
    const { writeAccessLog } = await import('../services/audit-log');

    await expect(
      writeAccessLog({ userId: 'u-1', action: 'READ', resource: 'Transaction' }),
    ).resolves.toBeUndefined();
    // The failure is logged but swallowed
    expect(loggerError).toHaveBeenCalled();
  });

  describe('withAuditedRequest', () => {
    it('invokes the inner fn and writes a log on success', async () => {
      mockPrisma.bankDataAccessLog.create.mockResolvedValueOnce({ id: 'log-3' });
      const { withAuditedRequest } = await import('../services/audit-log');

      const fakeReq = {
        user: { userId: 'u-2' },
        headers: { 'user-agent': 'curl/8.0' },
        ip: '9.9.9.9',
      } as unknown as import('express').Request;

      const result = await withAuditedRequest(fakeReq, 'READ', 'Transaction', async () => {
        return { ok: true };
      });

      expect(result).toEqual({ ok: true });
      const call = mockPrisma.bankDataAccessLog.create.mock.calls[0][0];
      expect(call.data.action).toBe('READ');
      expect(call.data.userAgent).toBe('curl/8.0');
    });

    it('still writes an audit entry when fn throws, then re-throws', async () => {
      mockPrisma.bankDataAccessLog.create.mockResolvedValueOnce({ id: 'log-4' });
      const { withAuditedRequest } = await import('../services/audit-log');

      const fakeReq = {
        user: { userId: 'u-3' },
        headers: {},
      } as unknown as import('express').Request;

      await expect(
        withAuditedRequest(fakeReq, 'UNLINK', 'PlaidItem', async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      const call = mockPrisma.bankDataAccessLog.create.mock.calls[0][0];
      expect(call.data.action).toBe('UNLINK');
      expect(call.data.context).toMatchObject({ failed: true });
    });
  });
});
