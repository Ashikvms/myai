import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// ── Validation schemas ────────────────

const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.enum(['INSURANCE', 'LEASE', 'CAR', 'TAX', 'MEDICAL', 'WARRANTY', 'IDENTITY', 'OTHER']),
  issueDate: z.string().datetime().optional(),
  expirationDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
});

const updateDocumentSchema = createDocumentSchema.partial().extend({
  summary: z.string().optional(),
});

// ── Routes ────────────────────────────

router.use(requireAuth);

// GET / — list documents
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.query;

    const where: Record<string, unknown> = {
      userId: req.user!.userId,
      deletedAt: null,
    };

    if (category) where.category = category as string;

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: documents });
  }),
);

// GET /expiring — documents expiring within 60 days
router.get(
  '/expiring',
  asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    const documents = await prisma.document.findMany({
      where: {
        userId: req.user!.userId,
        deletedAt: null,
        expirationDate: {
          gte: now,
          lte: sixtyDaysFromNow,
        },
      },
      orderBy: { expirationDate: 'asc' },
    });

    res.json({ success: true, data: documents });
  }),
);

// GET /:id — single document
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, deletedAt: null },
    });

    if (!document) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
      return;
    }

    res.json({ success: true, data: document });
  }),
);

// POST / — create document metadata
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors } });
      return;
    }

    const document = await prisma.document.create({
      data: {
        ...parsed.data,
        issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : undefined,
        expirationDate: parsed.data.expirationDate ? new Date(parsed.data.expirationDate) : undefined,
        userId: req.user!.userId,
      },
    });

    res.status(201).json({ success: true, data: document });
  }),
);

// POST /:id/presign-upload — generate presigned URL for R2 upload
router.post(
  '/:id/presign-upload',
  asyncHandler(async (req: Request, res: Response) => {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, deletedAt: null },
    });

    if (!document) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
      return;
    }

    // Placeholder: return mock presigned URL
    // Full implementation will use R2 SDK to generate a real presigned URL
    const mockUrl = `https://r2-placeholder.example.com/upload/${document.id}/${document.fileName || 'file'}?token=mock-presigned-token&expires=${Date.now() + 3600000}`;

    res.json({
      success: true,
      data: {
        uploadUrl: mockUrl,
        expiresIn: 3600,
        documentId: document.id,
      },
    });
  }),
);

// PUT /:id — update document
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors } });
      return;
    }

    const existing = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
      return;
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.issueDate) data.issueDate = new Date(parsed.data.issueDate);
    if (parsed.data.expirationDate) data.expirationDate = new Date(parsed.data.expirationDate);

    const document = await prisma.document.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: document });
  }),
);

// DELETE /:id — soft delete
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
      return;
    }

    await prisma.document.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true, data: { message: 'Document deleted' } });
  }),
);

export default router;
