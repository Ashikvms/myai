// ── Plan Limits ────────────────────────
export const PLAN_LIMITS = {
  FREE: {
    maxTasks: 25,
    maxDocuments: 10,
    maxReminders: 15,
    maxBills: 10,
    maxSubscriptions: 10,
    maxAppointments: 15,
    aiChatMessagesPerDay: 10,
    aiSummarizationsPerDay: 3,
  },
  PREMIUM: {
    maxTasks: Infinity,
    maxDocuments: Infinity,
    maxReminders: Infinity,
    maxBills: Infinity,
    maxSubscriptions: Infinity,
    maxAppointments: Infinity,
    aiChatMessagesPerDay: Infinity,
    aiSummarizationsPerDay: Infinity,
  },
} as const;

// ── Categories ─────────────────────────
export const TASK_CATEGORIES = [
  'Bills',
  'Health',
  'Finance',
  'Personal',
  'Tax',
  'Home',
  'Work',
  'Other',
] as const;

export const BILL_CATEGORIES = [
  'Housing',
  'Utilities',
  'Insurance',
  'Transportation',
  'Other',
] as const;

export const SUBSCRIPTION_CATEGORIES = [
  'Entertainment',
  'Health',
  'Tech',
  'Work',
  'Education',
  'Other',
] as const;

export const APPOINTMENT_CATEGORIES = [
  'Health',
  'Finance',
  'Car',
  'Personal',
  'Work',
  'Legal',
  'Other',
] as const;

// ── File Upload ────────────────────────
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

// ── Reminder Lead Times ────────────────
export const REMINDER_MINUTES_OPTIONS = [15, 30, 60, 120, 1440] as const;

// ── Design Tokens ──────────────────────
export const COLORS = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  secondary: '#8B5CF6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  bgLight: '#FAFAFA',
  bgDark: '#0F0F0F',
  surfaceLight: '#FFFFFF',
  surfaceDark: '#1A1A1A',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
} as const;
