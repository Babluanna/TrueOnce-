export type UserRole = 'admin' | 'user';

export interface AppConfig {
  appName: string;
  appIcon: string;
  isJailbreakMode: boolean;
  geminiApiKey?: string;
  features: {
    webBuilder: boolean;
    chat: boolean;
    feedback: boolean;
  };
  uiTheme: 'dark' | 'light' | 'system';
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  createdAt: number;
  lastLogin: number;
  usageStartTime?: number; // timestamp when session started
  totalUsageMs: number;
  isLocked: boolean;
  lockedAt?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  type?: 'chat' | 'webbuilder';
  attachments?: {
    name: string;
    type: string;
    data: string; // base64
  }[];
}

export interface UserFeedback {
  id: string;
  userId: string;
  userEmail: string;
  message: string;
  timestamp: number;
}

export interface UsageLog {
  id: string;
  userId: string;
  userEmail: string;
  prompt: string;
  timestamp: number;
  mode: 'chat' | 'webbuilder';
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  target?: string;
  details?: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  mode: 'chat' | 'webbuilder';
  createdAt: number;
  lastMessageAt: number;
}
