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

const createConversationSchema = z.object({
  title: z.string().max(200).optional(),
});

const chatSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
});

// ── Routes ────────────────────────────

router.use(requireAuth);

// GET /conversations — list conversations
router.get(
  '/conversations',
  asyncHandler(async (req: Request, res: Response) => {
    const conversations = await prisma.aiConversation.findMany({
      where: { userId: req.user!.userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
      },
    });

    res.json({ success: true, data: conversations });
  }),
);

// POST /conversations — create new conversation
router.post(
  '/conversations',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createConversationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors } });
      return;
    }

    const conversation = await prisma.aiConversation.create({
      data: {
        title: parsed.data.title || 'New Conversation',
        userId: req.user!.userId,
      },
    });

    res.status(201).json({ success: true, data: conversation });
  }),
);

// GET /conversations/:id/messages — list messages
router.get(
  '/conversations/:id/messages',
  asyncHandler(async (req: Request, res: Response) => {
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!conversation) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
      return;
    }

    const messages = await prisma.aiMessage.findMany({
      where: { conversationId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: messages });
  }),
);

// POST /chat — send message and get AI response
router.post(
  '/chat',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors } });
      return;
    }

    const userId = req.user!.userId;
    let conversationId = parsed.data.conversationId;

    // Create conversation if not provided
    if (!conversationId) {
      const conversation = await prisma.aiConversation.create({
        data: {
          title: parsed.data.message.slice(0, 100),
          userId,
        },
      });
      conversationId = conversation.id;
    } else {
      // Verify conversation belongs to user
      const conversation = await prisma.aiConversation.findFirst({
        where: { id: conversationId, userId },
      });

      if (!conversation) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
        return;
      }
    }

    // Store user message
    const userMessage = await prisma.aiMessage.create({
      data: {
        conversationId,
        role: 'USER',
        content: parsed.data.message,
      },
    });

    // Placeholder: mock AI response
    // Full implementation will call the Anthropic API with conversation context
    const mockResponse = `I understand you're asking about: "${parsed.data.message.slice(0, 50)}". This is a placeholder response. The full AI integration will be implemented in a future update.`;

    // Store assistant message
    const assistantMessage = await prisma.aiMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: mockResponse,
      },
    });

    // Update conversation's updatedAt
    await prisma.aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    res.json({
      success: true,
      data: {
        conversationId,
        userMessage,
        assistantMessage,
      },
    });
  }),
);

// DELETE /conversations/:id — delete conversation and messages
router.delete(
  '/conversations/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!conversation) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
      return;
    }

    // Messages cascade-delete via Prisma relation
    await prisma.aiConversation.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, data: { message: 'Conversation deleted' } });
  }),
);

export default router;
