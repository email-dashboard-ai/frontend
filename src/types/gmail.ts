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
  selectedThreadMessages: ParsedEmail[];
  isLoading: boolean;
  error: string | null;
  nextPageToken: string | null;
  knownUsers?: Record<
    string,
    { email: string; name: string; avatar: string | null }
  >;
}

export interface EmailPageResponse {
  messages: ParsedEmail[];
  nextPageToken: string | null;
}

// Smart Search Result from backend
export interface SearchResult {
  messageId: string;
  subject: string;
  from: string;
  snippet: string;
  receivedDate: string;
  strategy: "GMAIL_API" | "INTERNAL" | "HYBRID" | "SEMANTIC";
}

// Smart Search Request
export interface SearchRequest {
  // Gmail API fields → strategy: GMAIL_API or HYBRID
  from?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  filename?: string;
  after?: string; // YYYY-MM-DD
  before?: string; // YYYY-MM-DD
  label?: string;
  category?: string;
  hasAttachment?: boolean;
  isUnread?: boolean;
  isStarred?: boolean;
  isRead?: boolean;
  isImportant?: boolean;

  // Fuzzy search → strategy: INTERNAL or HYBRID
  body?: string;

  // When true, uses PostgreSQL trigram for typo-tolerant search (slower but more flexible)
  // When false/undefined, body search uses Gmail API (faster, exact match)
  useFuzzySearch?: boolean;
}

// Semantic Search Request (for AI-powered conceptual search)
export interface SemanticSearchRequest {
  query: string;
  limit?: number;
}

// Saved Search Request (for history with full state)
export interface SavedSearchRequest {
  request: SearchRequest;
  timestamp: number;
  displayLabel: string;
}
