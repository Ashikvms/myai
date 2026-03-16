import { z } from 'zod';
import {
  userSchema,
  taskSchema,
  billSchema,
  subscriptionSchema,
  documentSchema,
  appointmentSchema,
  reminderSchema,
  aiConversationSchema,
  aiMessageSchema,
  notificationPreferenceSchema,
} from './schemas';

// ── Enums ─────────────────────────────
export type Plan = 'FREE' | 'PREMIUM';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type BillFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
export type BillStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type DocumentCategory =
  | 'INSURANCE'
  | 'LEASE'
  | 'CAR'
  | 'TAX'
  | 'MEDICAL'
  | 'WARRANTY'
  | 'IDENTITY'
  | 'OTHER';
export type ReminderLinkedType =
  | 'TASK'
  | 'BILL'
  | 'SUBSCRIPTION'
  | 'APPOINTMENT'
  | 'DOCUMENT'
  | 'NONE';
export type ReminderStatus = 'PENDING' | 'SENT' | 'DISMISSED';
export type AiMessageRole = 'USER' | 'ASSISTANT';
export type InsightType = 'SPENDING' | 'RENEWAL' | 'EXPIRY' | 'TASK' | 'GENERAL';

// ── Inferred Types ─────────────────────
export type User = z.infer<typeof userSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Bill = z.infer<typeof billSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type Document = z.infer<typeof documentSchema>;
export type Appointment = z.infer<typeof appointmentSchema>;
export type Reminder = z.infer<typeof reminderSchema>;
export type AiConversation = z.infer<typeof aiConversationSchema>;
export type AiMessage = z.infer<typeof aiMessageSchema>;
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;

// ── AI Types ───────────────────────────
export interface UserContext {
  userId: string;
  name: string;
  plan: Plan;
  tasks: Task[];
  bills: Bill[];
  subscriptions: Subscription[];
  documents: Document[];
  appointments: Appointment[];
  reminders: Reminder[];
}

export interface DocumentSummary {
  summary: string;
  keyPoints: string[];
}

export interface ExtractedDate {
  label: string;
  date: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface TaskSuggestion {
  type: 'task';
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  reason: string;
}

export interface ReminderSuggestion {
  type: 'reminder';
  title: string;
  dateTime: string;
  linkedType: ReminderLinkedType;
  reason: string;
}

export interface DashboardInsight {
  type: InsightType;
  message: string;
  actionable: boolean;
}

export type ActionType =
  | 'CREATE_TASK'
  | 'CREATE_REMINDER'
  | 'CREATE_BILL'
  | 'CREATE_SUBSCRIPTION'
  | 'CREATE_APPOINTMENT'
  | 'UPDATE_TASK'
  | 'DELETE_TASK';

export interface StructuredAction {
  action: ActionType;
  payload: Record<string, unknown>;
  confidence: number;
}

// ── Plan Features ─────────────────────
export type PlanFeature =
  | 'AI_CHAT'
  | 'AI_SUMMARIZE'
  | 'AI_INSIGHTS'
  | 'UNLIMITED_TASKS'
  | 'UNLIMITED_DOCUMENTS'
  | 'UNLIMITED_REMINDERS'
  | 'ADVANCED_NOTIFICATIONS';

// ── API Types ─────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
