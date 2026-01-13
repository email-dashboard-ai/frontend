/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { gmailService } from '../../services/gmailService';
import { userService } from '../../services/userService';
import { indexedDBService } from '../../services/indexedDBService';
import type { GmailLabel, ParsedEmail, GmailState } from '../../types/gmail';
import { appConfig } from '../../config/appConfig';

// Debug flag - set to true to enable verbose cache logging
const DEBUG_CACHE = import.meta.env.DEV && false;
const log = DEBUG_CACHE ? console.log.bind(console) : () => { };

const initialState: GmailState = {
  labels: [],
  selectedLabel: null,
  messages: [],
  selectedMessage: null,
  selectedThreadMessages: [],
  isLoading: false,
  error: null,
  nextPageToken: null,
  knownUsers: {},
};

// Async thunks
export const fetchUserProfiles = createAsyncThunk(
  'gmail/fetchUserProfiles',
  async (emails: string[], { rejectWithValue }) => {
    try {
      const profiles = await userService.getUsersByEmails(emails);
      return profiles;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch user profiles');
    }
  }
);
export const fetchLabels = createAsyncThunk(
  'gmail/fetchLabels',
  async (userEmail: string, { rejectWithValue, signal, dispatch }) => {
    try {
      // Always try to get cached data first
      const cached = await indexedDBService.getLabels(userEmail);
      const isOffline = !navigator.onLine;

      // If we have cache
      if (cached && cached.data.length > 0) {
        log(`[Cache] Labels HIT - ${cached.data.length} labels, stale: ${cached.isStale}, offline: ${isOffline}`);

        // If offline, just return cache (don't try network)
        if (isOffline) {
          log('[Cache] Offline - using cached labels');
          return cached.data;
        }

        // If online and cache is stale, fetch fresh data in background
        if (cached.isStale) {
          log('[Cache] Fetching fresh labels in background...');
          gmailService.getLabels(signal)
            .then(freshLabels => {
              indexedDBService.setLabels(userEmail, freshLabels).catch(console.error);
              dispatch(setLabels(freshLabels));
            })
            .catch(err => {
              console.warn('[IndexedDB] Background refresh failed:', err.message);
            });
        }

        return cached.data;
      }

      // No cache - check if offline
      if (isOffline) {
        log('[Cache] Offline with no cache for labels');
        return rejectWithValue('You are offline. Labels will load when you reconnect.');
      }

      // No cache and online - fetch from network
      log('[Cache] Labels MISS - fetching from network');
      const networkStart = performance.now();
      const labels = await gmailService.getLabels(signal);
      const networkTime = performance.now() - networkStart;
      log(`[Cache] Labels fetched (${networkTime.toFixed(0)}ms)`);

      // Store in cache for next time
      indexedDBService.setLabels(userEmail, labels).catch(console.error);
      return labels;
    } catch (error: any) {
      // Network error - try to fallback to any available cache
      console.warn('[IndexedDB] Network error, trying cache fallback:', error.message);
      try {
        const fallbackCache = await indexedDBService.getLabels(userEmail);
        if (fallbackCache && fallbackCache.data.length > 0) {
          log('[Cache] Using labels fallback');
          return fallbackCache.data;
        }
      } catch {
        // Cache access failed too
      }

      return rejectWithValue(
        !navigator.onLine
          ? 'You are offline. Please connect to the internet.'
          : error.message || 'Failed to fetch labels'
      );
    }
  }
);


export const fetchMessages = createAsyncThunk(
  'gmail/fetchMessages',
  async ({ labelId, pageToken, limit = appConfig.gmail.defaultPageLimit, userEmail, forceRefresh = false }: { labelId: string; pageToken?: string; limit?: number; userEmail: string; forceRefresh?: boolean }, { rejectWithValue, signal, dispatch }) => {
    const isOffline = !navigator.onLine;

    try {
      const startTime = performance.now();

      // For first page (no pageToken), try cache first
      if (!pageToken) {
        const cached = await indexedDBService.getEmails(userEmail, labelId);

        if (cached && cached.data.length > 0) {
          const cacheTime = performance.now() - startTime;
          log(`[Cache] Messages HIT for ${labelId} (${cacheTime.toFixed(0)}ms) - ${cached.data.length} emails`);

          const cachedResponse = {
            messages: cached.data,
            nextPageToken: null,
          };

          // If offline, just return cache
          if (isOffline) {
            log(`[Cache] Offline - using cached messages for ${labelId}`);
            return cachedResponse;
          }

          // If forceRefresh requested but we're online, don't use cache
          if (forceRefresh) {
            log(`[Cache] Force refresh for ${labelId}`);
            // Continue to network fetch below
          } else {
            // If online and cache is stale, fetch fresh data in background
            if (cached.isStale) {
              log(`[Cache] Fetching fresh messages for ${labelId} in background`);
              gmailService.getMessages(labelId, undefined, limit, signal)
                .then(freshResponse => {
                  log(`[Cache] Background fetch complete for ${labelId}`);
                  indexedDBService.setEmails(userEmail, labelId, freshResponse.messages).catch(console.error);
                  dispatch(updateMessages(freshResponse));
                })
                .catch(err => {
                  console.warn(`[IndexedDB] Background refresh failed for ${labelId}:`, err.message);
                });
            }

            return cachedResponse;
          }
        }
      }

      // Check if offline before attempting network request
      if (isOffline) {
        log(`[Cache] Offline with no cache for ${labelId}`);

        // Try to get any cache as last resort
        const fallbackCache = await indexedDBService.getEmails(userEmail, labelId);
        if (fallbackCache && fallbackCache.data.length > 0) {
          log(`[Cache] Using fallback for ${labelId}`);
          return {
            messages: fallbackCache.data,
            nextPageToken: null,
          };
        }

        return rejectWithValue('You are offline. Emails will load when you reconnect.');
      }

      // Online - fetch from network
      const reason = forceRefresh ? 'FORCE REFRESH' : pageToken ? 'PAGINATION' : 'CACHE MISS';
      log(`[Cache] Messages ${reason} for ${labelId} - fetching from network`);
      const networkStart = performance.now();
      const response = await gmailService.getMessages(labelId, pageToken, limit, signal);
      const networkTime = performance.now() - networkStart;
      log(`[Cache] Messages fetched (${networkTime.toFixed(0)}ms) - ${response.messages.length} emails`);

      // Store in cache for next time (only first page)
      if (!pageToken) {
        log(`[Cache] Saving ${response.messages.length} messages to cache for ${labelId}`);
        indexedDBService.setEmails(userEmail, labelId, response.messages).catch(console.error);
      }

      return { ...response, isCacheHit: false };
    } catch (error: any) {
      console.warn(`[IndexedDB] Network error for ${labelId}, trying cache fallback:`, error.message);

      // Network error - try to fallback to cache
      try {
        const fallbackCache = await indexedDBService.getEmails(userEmail, labelId);
        if (fallbackCache && fallbackCache.data.length > 0) {
          log(`[Cache] Using fallback for ${labelId}`);
          return {
            messages: fallbackCache.data,
            nextPageToken: null,
          };
        }
      } catch (cacheError) {
        console.error('Cache fallback failed:', cacheError);
      }

      return rejectWithValue(
        !navigator.onLine
          ? 'You are offline. Please connect to the internet.'
          : error.message || 'Failed to fetch messages'
      );
    }
  }
);


// For infinite scroll - appends messages instead of replacing
export const fetchMoreMessages = createAsyncThunk(
  'gmail/fetchMoreMessages',
  async ({ labelId, pageToken, limit = appConfig.gmail.defaultPageLimit }: { labelId: string; pageToken: string; limit?: number }, { rejectWithValue, signal }) => {
    try {
      return await gmailService.getMessages(labelId, pageToken, limit, signal);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch more messages');
    }
  }
);

export const fetchMessage = createAsyncThunk(
  'gmail/fetchMessage',
  async ({ messageId, userEmail }: { messageId: string; userEmail: string }, { rejectWithValue, signal, dispatch }) => {
    try {
      // Try to get from cache first (stale-while-revalidate)
      const cached = await indexedDBService.getIndividualEmail(userEmail, messageId);

      if (cached && cached.data) {
        log(`[Cache] Individual email HIT for ${messageId}`);

        // If cache is stale and online, fetch fresh in background
        if (cached.isStale && navigator.onLine) {
          gmailService.getMessage(messageId, signal)
            .then(freshEmail => {
              log(`[Cache] Background fetch complete for message ${messageId}`);
              indexedDBService.setIndividualEmail(userEmail, freshEmail).catch(console.error);
              dispatch(setSelectedMessage(freshEmail));
            })
            .catch(console.error);
        }

        return cached.data;
      }

      // Check if offline with no cache
      if (!navigator.onLine) {
        log(`[Cache] Offline with no cache for message ${messageId}`);
        return rejectWithValue('You are offline and this email is not cached');
      }

      // No cache - fetch from network
      log(`[Cache] Individual email MISS for ${messageId}`);
      const email = await gmailService.getMessage(messageId, signal);

      // Cache for future offline access
      indexedDBService.setIndividualEmail(userEmail, email).catch(console.error);

      return email;
    } catch (error: any) {
      // If network error and we're offline, try cache as last resort
      if (!navigator.onLine) {
        const cached = await indexedDBService.getIndividualEmail(userEmail, messageId);
        if (cached?.data) {
          log(`[Cache] Using stale cache for ${messageId}`);
          return cached.data;
        }
      }
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
    // Helper actions for background cache updates (don't trigger loading state)
    setLabels: (state, action: PayloadAction<GmailLabel[]>) => {
      state.labels = action.payload;
    },
    updateMessages: (state, action: PayloadAction<{ messages: ParsedEmail[]; nextPageToken: string | null }>) => {
      state.messages = action.payload.messages;
      state.nextPageToken = action.payload.nextPageToken;
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
      // Fetch MORE messages (infinite scroll - APPEND)
      .addCase(fetchMoreMessages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMoreMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        // APPEND new messages to existing list (avoid duplicates)
        const existingIds = new Set(state.messages.map(m => m.id));
        const newMessages = action.payload.messages.filter(m => !existingIds.has(m.id));
        state.messages = [...state.messages, ...newMessages];
        state.nextPageToken = action.payload.nextPageToken;
      })
      .addCase(fetchMoreMessages.rejected, (state, action) => {
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
      })
      // Fetch User Profiles
      .addCase(fetchUserProfiles.fulfilled, (state, action) => {
        if (!state.knownUsers) state.knownUsers = {};
        action.payload.forEach(profile => {
          if (state.knownUsers) state.knownUsers[profile.email] = profile;
        });
      });
  },
});

export const { setSelectedLabel, setSelectedMessage, clearError, clearMessages, setLabels, updateMessages } = gmailSlice.actions;
export default gmailSlice.reducer;
