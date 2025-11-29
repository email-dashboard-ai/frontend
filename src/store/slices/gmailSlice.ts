import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { gmailService } from '../../services/gmailService';
import type { GmailLabel, ParsedEmail, GmailState } from '../../types/gmail';

const initialState: GmailState = {
  labels: [],
  selectedLabel: null,
  messages: [],
  selectedMessage: null,
  isLoading: false,
  error: null,
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

import { appConfig } from '../../config/appConfig';

export const fetchMessages = createAsyncThunk(
  'gmail/fetchMessages',
  async ({ labelId, page = 1, limit = appConfig.gmail.defaultPageLimit, isLoadMore = false }: { labelId: string; page?: number; limit?: number; isLoadMore?: boolean }, { rejectWithValue, signal }) => {
    try {
      const messages = await gmailService.getMessages(labelId, page, limit, signal);
      return { messages, isLoadMore };
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

const gmailSlice = createSlice({
  name: 'gmail',
  initialState,
  reducers: {
    setSelectedLabel: (state, action: PayloadAction<GmailLabel | null>) => {
      state.selectedLabel = action.payload;
      state.selectedMessage = null;
    },
    setSelectedMessage: (state, action: PayloadAction<ParsedEmail | null>) => {
      state.selectedMessage = action.payload;
    },
    clearError: (state) => {
      state.error = null;
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
        if (action.payload.isLoadMore) {
          state.messages = [...state.messages, ...action.payload.messages];
        } else {
          state.messages = action.payload.messages;
        }
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
      });
  },
});

export const { setSelectedLabel, setSelectedMessage, clearError } = gmailSlice.actions;
export default gmailSlice.reducer;
