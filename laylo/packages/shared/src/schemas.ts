import { z } from 'zod';

// ── Enum Schemas ───────────────────────
export const planSchema = z.enum(['FREE', 'PREMIUM']);
export const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const taskStatusSchema = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']);
export const billFrequencySchema = z.enum([
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'ANNUALLY',
]);
export const billStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']);
export const documentCategorySchema = z.enum([
  'INSURANCE',
  'LEASE',
  'CAR',
  'TAX',
  'MEDICAL',
  'WARRANTY',
  'IDENTITY',
  'OTHER',
]);
export const reminderLinkedTypeSchema = z.enum([
  'TASK',
  'BILL',
  'SUBSCRIPTION',
  'APPOINTMENT',
  'DOCUMENT',
  'NONE',
]);
export const reminderStatusSchema = z.enum(['PENDING', 'SENT', 'DISMISSED']);
export const aiMessageRoleSchema = z.enum(['USER', 'ASSISTANT']);

// ── Model Schemas ──────────────────────
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  plan: planSchema,
  onboardingComplete: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const taskSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).nullable(),
  dueDate: z.coerce.date().nullable(),
  category: z.string().max(50).nullable(),
  priority: prioritySchema,
  status: taskStatusSchema,
  isRecurring: z.boolean(),
  recurrenceRule: z.string().nullable(),
  completedAt: z.coerce.date().nullable(),
  deletedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const billSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1).max(200),
  category: z.string().max(50),
  amount: z.number().positive(),
  frequency: billFrequencySchema,
  nextDueDate: z.coerce.date(),
  isAutopay: z.boolean(),
  notes: z.string().max(2000).nullable(),
  status: billStatusSchema,
  deletedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const subscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1).max(200),
  category: z.string().max(50),
  amount: z.number().positive(),
  frequency: billFrequencySchema,
  nextRenewalDate: z.coerce.date(),
  isAutopay: z.boolean(),
  notes: z.string().max(2000).nullable(),
  status: billStatusSchema,
  cancellationDate: z.coerce.date().nullable(),
  deletedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const documentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1).max(200),
  category: documentCategorySchema,
  issueDate: z.coerce.date().nullable(),
  expirationDate: z.coerce.date().nullable(),
  notes: z.string().max(2000).nullable(),
  fileUrl: z.string().nullable(),
  fileName: z.string().nullable(),
  fileSize: z.number().nullable(),
  mimeType: z.string().nullable(),
  summary: z.string().nullable(),
  deletedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const appointmentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1).max(200),
  dateTime: z.coerce.date(),
  endTime: z.coerce.date().nullable(),
  location: z.string().max(500).nullable(),
  notes: z.string().max(2000).nullable(),
  category: z.string().max(50).nullable(),
  reminderMinutes: z.number().int().min(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const reminderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1).max(200),
  dateTime: z.coerce.date(),
  isRecurring: z.boolean(),
  recurrenceRule: z.string().nullable(),
  linkedType: reminderLinkedTypeSchema,
  linkedId: z.string().nullable(),
  status: reminderStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const aiConversationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const aiMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: aiMessageRoleSchema,
  content: z.string(),
  metadata: z.unknown().nullable(),
  createdAt: z.coerce.date(),
});

export const notificationPreferenceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  billReminders: z.boolean(),
  appointmentReminders: z.boolean(),
  documentExpiry: z.boolean(),
  taskReminders: z.boolean(),
  reminderLeadDays: z.number().int().min(0).max(30),
  pushToken: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ── Input Schemas (for API validation) ──
export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least 1 number'),
  name: z.string().min(1).max(100),
});

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createTaskInputSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
  dueDate: z.coerce.date().optional(),
  category: z.string().max(50).optional(),
  priority: prioritySchema.default('MEDIUM'),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
});

export const updateTaskInputSchema = createTaskInputSchema.partial().extend({
  id: z.string(),
  status: taskStatusSchema.optional(),
});

export const createBillInputSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(50),
  amount: z.number().positive(),
  frequency: billFrequencySchema,
  nextDueDate: z.coerce.date(),
  isAutopay: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
});

export const updateBillInputSchema = createBillInputSchema.partial().extend({
  id: z.string(),
  status: billStatusSchema.optional(),
});

export const createSubscriptionInputSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(50),
  amount: z.number().positive(),
  frequency: billFrequencySchema,
  nextRenewalDate: z.coerce.date(),
  isAutopay: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
});

export const updateSubscriptionInputSchema = createSubscriptionInputSchema
  .partial()
  .extend({
    id: z.string(),
    status: billStatusSchema.optional(),
    cancellationDate: z.coerce.date().optional(),
  });

export const createDocumentInputSchema = z.object({
  title: z.string().min(1).max(200),
  category: documentCategorySchema,
  issueDate: z.coerce.date().optional(),
  expirationDate: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
});

export const updateDocumentInputSchema = createDocumentInputSchema
  .partial()
  .extend({
    id: z.string(),
  });

export const createAppointmentInputSchema = z.object({
  title: z.string().min(1).max(200),
  dateTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  location: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  category: z.string().max(50).optional(),
  reminderMinutes: z.number().int().min(0).default(30),
});

export const updateAppointmentInputSchema = createAppointmentInputSchema
  .partial()
  .extend({
    id: z.string(),
  });

export const createReminderInputSchema = z.object({
  title: z.string().min(1).max(200),
  dateTime: z.coerce.date(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
  linkedType: reminderLinkedTypeSchema.default('NONE'),
  linkedId: z.string().optional(),
});

export const updateReminderInputSchema = createReminderInputSchema
  .partial()
  .extend({
    id: z.string(),
    status: reminderStatusSchema.optional(),
  });
