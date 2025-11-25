export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export const APP_NAME = 'AI Email Client';
export const APP_VERSION = '1.0.0';

// Token keys
export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'theme',
  USER_PREFERENCES: 'user_preferences',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    GOOGLE: '/auth/google',
    ME: '/auth/me',
  },
  EMAILS: {
    LIST: '/emails',
    DETAIL: '/emails/:id',
    SEARCH: '/emails/search',
    UPDATE: '/emails/:id',
    DELETE: '/emails/:id',
    SEND: '/emails/send',
    REPLY: '/emails/:id/reply',
  },
  MAILBOXES: {
    LIST: '/mailboxes',
    EMAILS: '/mailboxes/:id/emails',
  },
} as const;

// Email priorities
export const EMAIL_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  NORMAL: 'normal',
  LOW: 'low',
} as const;

// Email columns (Kanban board)
export const EMAIL_COLUMNS = {
  INBOX: 'inbox',
  TODO: 'todo', 
  DONE: 'done',
} as const;

// Snooze options
export const SNOOZE_OPTIONS = [
  { label: 'Later today', hours: 8, icon: 'Sun' },
  { label: 'Tomorrow', hours: 24, icon: 'Calendar' },
  { label: 'Next week', hours: 168, icon: 'Moon' },
] as const;