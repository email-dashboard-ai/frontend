export interface Email {
  id: string;
  sender: string;
  senderEmail: string;
  avatar: string;
  time: string;
  subject: string;
  summary: string;
  body: string;
  column: 'inbox' | 'todo' | 'done';
  priority: 'high' | 'medium' | 'low' | 'normal';
  isRead: boolean;
  isStarred: boolean;
  order: number;
  attachments?: Attachment[];
  matchReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  downloadUrl: string;
}

export interface EmailState {
  emails: Email[];
  selectedEmail: Email | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  searchResults: Email[];
  currentView: 'board' | 'search' | 'detail';
  snoozeModalOpen: boolean;
  selectedEmailForSnooze: Email | null;
}

export interface Mailbox {
  id: string;
  name: string;
  type: 'inbox' | 'starred' | 'sent' | 'drafts' | 'archive' | 'trash' | 'custom';
  unreadCount: number;
  totalCount: number;
}