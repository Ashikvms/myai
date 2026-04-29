import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const accounts = await prisma.bankAccount.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        plaidItem: {
          select: { id: true, institutionName: true, institutionLogo: true, status: true },
        },
      },
    });

    res.json({ success: true, data: accounts });
  }),
);

export default router;
