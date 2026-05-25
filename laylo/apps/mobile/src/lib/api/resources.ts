/**
 * Resource API helpers — thin typed wrappers around the BillBee API.
 *
 * Each call unwraps the standard `{ success, data }` envelope so
 * consumers (and React Query) work with the `data` payload directly.
 */
import { api } from '../api';
import type { ApiEnvelope } from './types';

// ─── Dashboard ─────────────────────────────────────────────────────

export interface DashboardConnectedAccount {
  id: string;
  institutionName: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  currentBalance: number | null;
  isoCurrencyCode: string;
}

export interface DashboardRecentTransaction {
  id: string;
  date: string;
  name: string;
  merchantName: string | null;
  amount: number;
  isoCurrencyCode: string;
  category: string | null;
  accountId: string;
  accountName: string;
  pending: boolean;
}

export interface DashboardTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
}

export interface DashboardBill {
  id: string;
  name: string;
  amount: number | string;
  nextDueDate: string;
  category: string | null;
  frequency: string;
  status: string;
  autopay: boolean;
}

export interface DashboardData {
  pendingTasks: number;
  todayTasks: DashboardTask[];
  billsDueSoon: DashboardBill[];
  totalMonthlyBills: number;
  totalMonthlySubs: number;
  activeSubscriptions: number;
  upcomingAppointments: unknown[];
  pendingReminders: number;
  expiringDocuments: unknown[];
  recentDocuments: unknown[];
  connectedAccounts: {
    count: number;
    totalBalance: number;
    totalDebt: number;
    accounts: DashboardConnectedAccount[];
  };
  recentTransactions: DashboardRecentTransaction[];
}

export function getDashboard(): Promise<DashboardData> {
  return api
    .get<ApiEnvelope<DashboardData>>('/api/dashboard')
    .then((r) => r.data);
}

// ─── Tasks ─────────────────────────────────────────────────────────

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ApiTask {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  category: string | null;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export function listTasks(): Promise<ApiTask[]> {
  return api.get<ApiEnvelope<ApiTask[]>>('/api/tasks').then((r) => r.data);
}

export function completeTask(id: string): Promise<ApiTask> {
  return api
    .put<ApiEnvelope<ApiTask>>(`/api/tasks/${encodeURIComponent(id)}/complete`)
    .then((r) => r.data);
}

export function uncompleteTask(id: string): Promise<ApiTask> {
  return api
    .put<ApiEnvelope<ApiTask>>(`/api/tasks/${encodeURIComponent(id)}`, {
      status: 'PENDING',
    })
    .then((r) => r.data);
}

// ─── Bills + Subscriptions ─────────────────────────────────────────

export type BillFrequency =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUALLY';

export interface ApiBill {
  id: string;
  userId: string;
  name: string;
  amount: number | string;
  frequency: BillFrequency;
  nextDueDate: string;
  category: string | null;
  status: string;
  autopay: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSubscription {
  id: string;
  userId: string;
  name: string;
  amount: number | string;
  frequency: BillFrequency;
  nextDueDate?: string;
  renewalDate?: string;
  category: string | null;
  status: string;
  autopay: boolean;
  createdAt: string;
  updatedAt: string;
}

export function listBills(): Promise<ApiBill[]> {
  return api.get<ApiEnvelope<ApiBill[]>>('/api/bills').then((r) => r.data);
}

export function listSubscriptions(): Promise<ApiSubscription[]> {
  return api
    .get<ApiEnvelope<ApiSubscription[]>>('/api/subscriptions')
    .then((r) => r.data);
}

// ─── Documents / Reminders / Appointments ──────────────────────────

export interface ApiDocument {
  id: string;
  title: string;
  category: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  expirationDate: string | null;
  createdAt: string;
}

export interface ApiReminder {
  id: string;
  title: string;
  dueAt: string;
  status: 'PENDING' | 'DISMISSED' | 'COMPLETED';
  recurring: boolean;
  recurrenceRule: string | null;
  linkedType: string | null;
  linkedId: string | null;
}

export interface ApiAppointment {
  id: string;
  title: string;
  dateTime: string;
  endTime?: string | null;
  location: string | null;
  category: string | null;
  reminderMinutes: number | null;
  notes: string | null;
}

export function listDocuments(): Promise<ApiDocument[]> {
  return api
    .get<ApiEnvelope<ApiDocument[]>>('/api/documents')
    .then((r) => r.data);
}

export function listReminders(): Promise<ApiReminder[]> {
  return api
    .get<ApiEnvelope<ApiReminder[]>>('/api/reminders')
    .then((r) => r.data);
}

export function dismissReminder(id: string): Promise<ApiReminder> {
  return api
    .put<ApiEnvelope<ApiReminder>>(`/api/reminders/${encodeURIComponent(id)}`, {
      status: 'DISMISSED',
    })
    .then((r) => r.data);
}

export function listAppointments(): Promise<ApiAppointment[]> {
  return api
    .get<ApiEnvelope<ApiAppointment[]>>('/api/appointments')
    .then((r) => r.data);
}

// ─── AI ────────────────────────────────────────────────────────────

export interface AiChatResponse {
  conversationId: string;
  userMessage: { id: string; role: string; content: string; createdAt: string };
  assistantMessage: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  };
}

export function askAi(
  message: string,
  conversationId?: string,
): Promise<AiChatResponse> {
  return api
    .post<ApiEnvelope<AiChatResponse>>('/api/ai/chat', {
      message,
      ...(conversationId ? { conversationId } : {}),
    })
    .then((r) => r.data);
}
