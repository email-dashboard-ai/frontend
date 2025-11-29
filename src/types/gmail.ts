// Gmail API Types (matching backend response)

export interface GmailLabel {
  id: string;
  name: string;
  type?: string;
  messageListVisibility?: string;
  labelListVisibility?: string;
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
}

export interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: {
    size?: number;
    data?: string;
    attachmentId?: string;
  };
  parts?: GmailMessagePart[];
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessage {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  payload?: GmailMessagePart;
  sizeEstimate?: number;
  historyId?: string;
  internalDate?: string;
  raw?: string;
}

// Parsed email for UI display
export interface ParsedEmail {
  id: string;
  threadId: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  isRead: boolean;
  isStarred: boolean;
  labelIds: string[];
  attachments: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

// UI State
export interface GmailState {
  labels: GmailLabel[];
  selectedLabel: GmailLabel | null;
  messages: ParsedEmail[];
  selectedMessage: ParsedEmail | null;
  isLoading: boolean;
  error: string | null;
  nextPageToken: string | null;
}

export interface EmailPageResponse {
  messages: ParsedEmail[];
  nextPageToken: string | null;
}
