import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Email, EmailState, PaginationParams } from '../../types';
import { emailService } from '../../services/emailService';

const initialState: EmailState = {
  emails: [],
  selectedEmail: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  searchResults: [],
  currentView: 'board',
  snoozeModalOpen: false,
  selectedEmailForSnooze: null,
};

// Async thunks
export const fetchEmails = createAsyncThunk(
  'email/fetchEmails',
  async (params: PaginationParams | undefined, { rejectWithValue }) => {
    try {
      const response = await emailService.getEmails(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch emails');
    }
  }
);

export const fetchEmailById = createAsyncThunk(
  'email/fetchEmailById',
  async (emailId: string, { rejectWithValue }) => {
    try {
      const email = await emailService.getEmailById(emailId);
      return email;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch email');
    }
  }
);

export const searchEmails = createAsyncThunk(
  'email/searchEmails',
  async (query: string, { rejectWithValue }) => {
    try {
      const results = await emailService.searchEmails(query);
      return results;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Search failed');
    }
  }
);

export const updateEmailColumn = createAsyncThunk(
  'email/updateEmailColumn',
  async ({ emailId, column }: { emailId: string; column: Email['column'] }, { rejectWithValue }) => {
    try {
      const updatedEmail = await emailService.updateEmail(emailId, { column });
      return { emailId, column: updatedEmail.column };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update email');
    }
  }
);

export const toggleEmailStar = createAsyncThunk(
  'email/toggleEmailStar',
  async (emailId: string, { rejectWithValue }) => {
    try {
      const updatedEmail = await emailService.toggleStar(emailId);
      return { emailId, isStarred: updatedEmail.isStarred };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to toggle star');
    }
  }
);

const emailSlice = createSlice({
  name: 'email',
  initialState,
  reducers: {
    setCurrentView: (state, action: PayloadAction<EmailState['currentView']>) => {
      state.currentView = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      if (!action.payload.trim()) {
        state.searchResults = [];
      }
    },
    selectEmail: (state, action: PayloadAction<Email | null>) => {
      state.selectedEmail = action.payload;
    },
    openSnoozeModal: (state, action: PayloadAction<Email>) => {
      state.snoozeModalOpen = true;
      state.selectedEmailForSnooze = action.payload;
    },
    closeSnoozeModal: (state) => {
      state.snoozeModalOpen = false;
      state.selectedEmailForSnooze = null;
    },
    // Optimistic UI updates
    moveEmailToColumn: (state, action: PayloadAction<{ emailId: string; column: Email['column'] }>) => {
      const email = state.emails.find(e => e.id === action.payload.emailId);
      if (email) {
        email.column = action.payload.column;
        email.updatedAt = new Date().toISOString();
        
        // Set order to be at the end of the new column
        const emailsInTargetColumn = state.emails.filter(e => 
          e.column === action.payload.column && e.id !== action.payload.emailId
        );
        email.order = emailsInTargetColumn.length > 0 
          ? Math.max(...emailsInTargetColumn.map(e => e.order)) + 1 
          : 1;
      }
      // Update search results if email is in there
      const searchResultEmail = state.searchResults.find(e => e.id === action.payload.emailId);
      if (searchResultEmail) {
        searchResultEmail.column = action.payload.column;
        searchResultEmail.updatedAt = new Date().toISOString();
      }
    },
    reorderEmailsInColumn: (state, action: PayloadAction<{
      draggedId: string;
      hoveredId: string;
      column: Email['column'];
    }>) => {
      const { draggedId, hoveredId, column } = action.payload;
      
      const draggedEmail = state.emails.find(e => e.id === draggedId);
      const hoveredEmail = state.emails.find(e => e.id === hoveredId);
      
      if (!draggedEmail || !hoveredEmail) return;
      
      // Get all emails in the column
      const columnEmails = state.emails
        .filter(e => e.column === column)
        .sort((a, b) => a.order - b.order);
      
      // Find positions
      const draggedIndex = columnEmails.findIndex(e => e.id === draggedId);
      const hoveredIndex = columnEmails.findIndex(e => e.id === hoveredId);
      
      if (draggedIndex === -1 || hoveredIndex === -1) return;
      
      // Remove dragged email from current position
      const [removed] = columnEmails.splice(draggedIndex, 1);
      
      // Insert at hovered position
      columnEmails.splice(hoveredIndex, 0, removed);
      
      // Update orders
      columnEmails.forEach((email, index) => {
        const originalEmail = state.emails.find(e => e.id === email.id);
        if (originalEmail) {
          originalEmail.order = index + 1;
          originalEmail.updatedAt = new Date().toISOString();
        }
      });
    },
    markEmailAsRead: (state, action: PayloadAction<string>) => {
      const email = state.emails.find(e => e.id === action.payload);
      if (email) {
        email.isRead = true;
        email.updatedAt = new Date().toISOString();
      }
    },
    toggleEmailStarLocal: (state, action: PayloadAction<string>) => {
      const email = state.emails.find(e => e.id === action.payload);
      if (email) {
        email.isStarred = !email.isStarred;
        email.updatedAt = new Date().toISOString();
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch emails
      .addCase(fetchEmails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEmails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.emails = action.payload;
        state.error = null;
      })
      .addCase(fetchEmails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch email by ID
      .addCase(fetchEmailById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEmailById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedEmail = action.payload;
        state.error = null;
      })
      .addCase(fetchEmailById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Search emails
      .addCase(searchEmails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchEmails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.searchResults = action.payload;
        state.currentView = 'search';
        state.error = null;
      })
      .addCase(searchEmails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update email column
      .addCase(updateEmailColumn.fulfilled, (state, action) => {
        const email = state.emails.find(e => e.id === action.payload.emailId);
        if (email) {
          email.column = action.payload.column;
          email.updatedAt = new Date().toISOString();
        }
      })
      .addCase(updateEmailColumn.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Toggle star
      .addCase(toggleEmailStar.fulfilled, (state, action) => {
        const email = state.emails.find(e => e.id === action.payload.emailId);
        if (email) {
          email.isStarred = action.payload.isStarred;
          email.updatedAt = new Date().toISOString();
        }
      })
      .addCase(toggleEmailStar.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setCurrentView,
  setSearchQuery,
  selectEmail,
  openSnoozeModal,
  closeSnoozeModal,
  moveEmailToColumn,
  reorderEmailsInColumn,
  markEmailAsRead,
  toggleEmailStarLocal,
  clearError,
} = emailSlice.actions;

export default emailSlice.reducer;