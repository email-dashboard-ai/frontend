import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { gmailService } from '../../services/gmailService';
import type { GmailLabel, ParsedEmail, GmailState } from '../../types/gmail';
import { appConfig } from '../../config/appConfig';

const initialState: GmailState = {
  labels: [],
  selectedLabel: null,
  messages: [],
  selectedMessage: null,
  selectedThreadMessages: [],
  isLoading: false,
  error: null,
  nextPageToken: null,
};

// Async thunks
export const fetchLabels = createAsyncThunk(
  'gmail/fetchLabels',
  async (_, { rejectWithValue, signal }) => {
    try {
      return await gmailService.getLabels(signal);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch labels');
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'gmail/fetchMessages',
  async ({ labelId, pageToken, limit = appConfig.gmail.defaultPageLimit }: { labelId: string; pageToken?: string; limit?: number }, { rejectWithValue, signal }) => {
    try {
      return await gmailService.getMessages(labelId, pageToken, limit, signal);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch messages');
    }
  }
);

export const fetchMessage = createAsyncThunk(
  'gmail/fetchMessage',
  async (messageId: string, { rejectWithValue, signal }) => {
    try {
      return await gmailService.getMessage(messageId, signal);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch message');
    }
  }
);

export const markEmailAsRead = createAsyncThunk(
  'gmail/markAsRead',
  async (messageId: string, { rejectWithValue }) => {
    try {
      await gmailService.markAsRead(messageId);
      return messageId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark as read');
    }
  }
);

export const markEmailAsUnread = createAsyncThunk(
  'gmail/markAsUnread',
  async (messageId: string, { rejectWithValue }) => {
    try {
      await gmailService.markAsUnread(messageId);
      return messageId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark as unread');
    }
  }
);

export const toggleEmailStar = createAsyncThunk(
  'gmail/toggleStar',
  async ({ messageId, starred }: { messageId: string; starred: boolean }, { rejectWithValue }) => {
    try {
      await gmailService.toggleStar(messageId, starred);
      return { messageId, starred };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to toggle star');
    }
  }
);

export const deleteEmailAction = createAsyncThunk(
  'gmail/deleteEmail',
  async (messageId: string, { rejectWithValue }) => {
    try {
      await gmailService.deleteEmail(messageId);
      return messageId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete email');
    }
  }
);

export const untrashEmailAction = createAsyncThunk(
  'gmail/untrashEmail',
  async (messageId: string, { rejectWithValue }) => {
    try {
      await gmailService.untrashEmail(messageId);
      return messageId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to restore email');
    }
  }
);

export const batchDeleteEmailsAction = createAsyncThunk(
  'gmail/batchDelete',
  async (ids: string[], { rejectWithValue }) => {
    try {
      await gmailService.batchDeleteEmails(ids);
      return ids;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to batch delete emails');
    }
  }
);

export const batchUpdateStatusAction = createAsyncThunk(
  'gmail/batchUpdateStatus',
  async ({ ids, isRead }: { ids: string[]; isRead: boolean }, { rejectWithValue }) => {
    try {
      await gmailService.batchUpdateStatus(ids, isRead);
      return { ids, isRead };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to batch update status');
    }
  }
);

export const fetchThread = createAsyncThunk(
  'gmail/fetchThread',
  async (threadId: string, { rejectWithValue, signal }) => {
    try {
      return await gmailService.getThread(threadId, signal);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch thread');
    }
  }
);

const gmailSlice = createSlice({
  name: 'gmail',
  initialState,
  reducers: {
    setSelectedLabel: (state, action: PayloadAction<GmailLabel | null>) => {
      state.selectedLabel = action.payload;
      state.selectedMessage = null;
      state.selectedThreadMessages = [];
      state.nextPageToken = null; // Reset pagination on label change
    },
    setSelectedMessage: (state, action: PayloadAction<ParsedEmail | null>) => {
      console.log('gmailSlice: setSelectedMessage', action.payload);
      state.selectedMessage = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearMessages: (state) => {
      state.messages = [];
      state.selectedMessage = null;
      state.selectedThreadMessages = [];
      state.isLoading = false;
      state.nextPageToken = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch labels
      .addCase(fetchLabels.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLabels.fulfilled, (state, action) => {
        state.isLoading = false;
        state.labels = action.payload;
        // Auto-select INBOX if no label selected
        if (!state.selectedLabel && action.payload.length > 0) {
          const inbox = action.payload.find(l => l.id === 'INBOX');
          state.selectedLabel = inbox || action.payload[0];
        }
      })
      .addCase(fetchLabels.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        state.messages = action.payload.messages;
        state.nextPageToken = action.payload.nextPageToken;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch single message
      .addCase(fetchMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMessage.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedMessage = action.payload;
      })
      .addCase(fetchMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Mark as read
      .addCase(markEmailAsRead.fulfilled, (state, action) => {
        const messageId = action.payload;
        // Update in messages list
        const message = state.messages.find(m => m.id === messageId);
        if (message) {
          message.isRead = true;
          message.labelIds = message.labelIds.filter(id => id !== 'UNREAD');
        }
        // Update selected message
        if (state.selectedMessage?.id === messageId) {
          state.selectedMessage.isRead = true;
          state.selectedMessage.labelIds = state.selectedMessage.labelIds.filter(id => id !== 'UNREAD');
        }
      })
      // Mark as unread
      .addCase(markEmailAsUnread.fulfilled, (state, action) => {
        const messageId = action.payload;
        // Update in messages list
        const message = state.messages.find(m => m.id === messageId);
        if (message) {
          message.isRead = false;
          if (!message.labelIds.includes('UNREAD')) {
            message.labelIds.push('UNREAD');
          }
        }
        // Update selected message
        if (state.selectedMessage?.id === messageId) {
          state.selectedMessage.isRead = false;
          if (!state.selectedMessage.labelIds.includes('UNREAD')) {
            state.selectedMessage.labelIds.push('UNREAD');
          }
        }
      })
      // Toggle star
      .addCase(toggleEmailStar.fulfilled, (state, action) => {
        const { messageId, starred } = action.payload;
        // Update in messages list
        const message = state.messages.find(m => m.id === messageId);
        if (message) {
          message.isStarred = starred;
          if (starred && !message.labelIds.includes('STARRED')) {
            message.labelIds.push('STARRED');
          } else if (!starred) {
            message.labelIds = message.labelIds.filter(id => id !== 'STARRED');
          }
        }
        // Update selected message
        if (state.selectedMessage?.id === messageId) {
          state.selectedMessage.isStarred = starred;
          if (starred && !state.selectedMessage.labelIds.includes('STARRED')) {
            state.selectedMessage.labelIds.push('STARRED');
          } else if (!starred) {
            state.selectedMessage.labelIds = state.selectedMessage.labelIds.filter(id => id !== 'STARRED');
          }
        }
      })
      // Delete email
      .addCase(deleteEmailAction.fulfilled, (state, action) => {
        const messageId = action.payload;
        // Remove from messages list
        state.messages = state.messages.filter(m => m.id !== messageId);
        // Clear selected message if it was deleted
        if (state.selectedMessage?.id === messageId) {
          state.selectedMessage = null;
        }
      })
      // Untrash email
      .addCase(untrashEmailAction.fulfilled, (state, action) => {
        const messageId = action.payload;
        // Remove from messages list (assuming we are not in TRASH, or if we are, it disappears)
        state.messages = state.messages.filter(m => m.id !== messageId);
        // Clear selected message if it was moved
        if (state.selectedMessage?.id === messageId) {
          state.selectedMessage = null;
        }
      })
      // Batch Delete
      .addCase(batchDeleteEmailsAction.fulfilled, (state, action) => {
        const ids = action.payload;
        state.messages = state.messages.filter(m => !ids.includes(m.id));
        if (state.selectedMessage && ids.includes(state.selectedMessage.id)) {
          state.selectedMessage = null;
        }
      })
      // Batch Update Status
      .addCase(batchUpdateStatusAction.fulfilled, (state, action) => {
        const { ids, isRead } = action.payload;
        state.messages.forEach(m => {
          if (ids.includes(m.id)) {
            m.isRead = isRead;
            if (isRead) {
              m.labelIds = m.labelIds.filter(id => id !== 'UNREAD');
            } else {
              if (!m.labelIds.includes('UNREAD')) m.labelIds.push('UNREAD');
            }
          }
        });
        if (state.selectedMessage && ids.includes(state.selectedMessage.id)) {
          state.selectedMessage.isRead = isRead;
          if (isRead) {
            state.selectedMessage.labelIds = state.selectedMessage.labelIds.filter(id => id !== 'UNREAD');
          } else {
            if (!state.selectedMessage.labelIds.includes('UNREAD')) {
              state.selectedMessage.labelIds.push('UNREAD');
            }
          }
        }
      })
      // Fetch thread
      .addCase(fetchThread.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchThread.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedThreadMessages = action.payload;
        // Also update selectedMessage to be the last message in the thread if not set or if part of thread
        if (action.payload.length > 0) {
          // We might want to keep the specifically clicked message as 'selectedMessage',
          // but 'selectedThreadMessages' will hold the full conversation.
          // For now, let's ensure the selectedMessage is consistent with the thread if needed.
        }
      })
      .addCase(fetchThread.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedLabel, setSelectedMessage, clearError, clearMessages } = gmailSlice.actions;
export default gmailSlice.reducer;
