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

export const fetchMessages = createAsyncThunk(
  'gmail/fetchMessages',
  async ({ labelId, page = 1, limit = 50 }: { labelId: string; page?: number; limit?: number }, { rejectWithValue, signal }) => {
    try {
      return await gmailService.getMessages(labelId, page, limit, signal);
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
        state.messages = action.payload;
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
      });
  },
});

export const { setSelectedLabel, setSelectedMessage, clearError } = gmailSlice.actions;
export default gmailSlice.reducer;
