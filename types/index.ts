export type Priority = 'high' | 'medium' | 'low';

export type TaskCategory = 'bills' | 'health' | 'finance' | 'home' | 'personal' | 'work';

export type TaskFilter = 'today' | 'upcoming' | 'completed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: Priority;
  category: TaskCategory;
  completed: boolean;
  createdAt: string;
}

export type DocumentCategory = 'all' | 'bills' | 'medical' | 'insurance' | 'tax' | 'legal';

export interface Document {
  id: string;
  title: string;
  category: DocumentCategory;
  dateAdded: string;
  fileSize: string;
  thumbnail?: string;
  description?: string;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  category: string;
}

export interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  type: string;
}

export interface UserPreferences {
  darkMode: boolean | 'system';
  notifications: boolean;
  defaultAIModel: string;
  userName: string;
  userEmail: string;
}
