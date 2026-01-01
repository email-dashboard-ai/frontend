/**
 * API Configuration Manager
 * Handles API communication with the production backend
 */

import axios from "axios";

import type { RootState } from "../store";

export interface ApiConfig {
  baseUrl: string;
  endpoints: {
    auth: {
      login: string;
      register: string;
      refresh: string;
      logout: string;
      google: string;
    };
    gmail: {
      labels: string;
      list: (labelId: string) => string;
      get: (id: string) => string;
      markRead: (id: string) => string;
      markUnread: (id: string) => string;
      toggleStar: (id: string) => string;
      delete: (id: string) => string;
      untrash: (id: string) => string;
      archive: (id: string) => string;
      batchDelete: string;
      batchStatus: string;
      attachment: (messageId: string, attachmentId: string) => string;
      send: string;
      reply: (id: string) => string;
      snooze: (id: string) => string;
      unsnooze: (id: string) => string;
      snoozedInfo: string;
      thread: (id: string) => string;
      search: string;
    };
    kanban: {
      statuses: string;
      update: string;
    };
  };
  headers: Record<string, string>;
}

class ApiConfigManager {
  private config: ApiConfig;

  constructor() {
    this.config = this.buildConfig();
  }

  private buildConfig(): ApiConfig {
    const baseUrl =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

    return {
      baseUrl,
      endpoints: {
        auth: {
          login: "/api/auth/login",
          register: "/api/auth/register",
          refresh: "/api/auth/refresh-token",
          logout: "/api/auth/logout",
          google: "/api/auth/google",
        },
        gmail: {
          labels: "/api/gmail/labels",
          list: (labelId: string) => `/api/gmail/list/${labelId}`,
          get: (id: string) => `/api/gmail/${id}`,
          markRead: (id: string) => `/api/gmail/${id}/read`,
          markUnread: (id: string) => `/api/gmail/${id}/unread`,
          toggleStar: (id: string) => `/api/gmail/${id}/star`,
          delete: (id: string) => `/api/gmail/${id}`,
          untrash: (id: string) => `/api/gmail/${id}/untrash`,
          archive: (id: string) => `/api/gmail/${id}/archive`,
          batchDelete: "/api/gmail/batch/delete",
          batchStatus: "/api/gmail/batch/status",
          attachment: (messageId: string, attachmentId: string) => `/api/gmail/${messageId}/attachments/${attachmentId}`,
          send: "/api/gmail/send",
          reply: (id: string) => `/api/gmail/${id}/reply`,
          snooze: (id: string) => `/api/gmail/${id}/snooze`,
          unsnooze: (id: string) => `/api/gmail/${id}/unsnooze`,
          snoozedInfo: "/api/gmail/snoozed-info",
          thread: (id: string) => `/api/gmail/thread/${id}`,
          search: "/api/gmail/search",
        },
        kanban: {
          statuses: "/api/kanban/statuses",
          update: "/api/kanban/status",
        },
      },
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    };
  }

  public getConfig(): ApiConfig {
    return this.config;
  }

  public getFullUrl(endpoint: string): string {
    return `${this.config.baseUrl}${endpoint}`;
  }
}

// Singleton instance
export const apiConfig = new ApiConfigManager();

// Create Axios instance
export const api = axios.create({
  baseURL: apiConfig.getConfig().baseUrl,
  headers: apiConfig.getConfig().headers,
  timeout: 50000,
});

// Store reference for interceptor
let store: { getState: () => RootState; dispatch: any } | null = null;

export const setStoreForApi = (storeInstance: { getState: () => RootState; dispatch: any }) => {
  store = storeInstance;
};

// Request interceptor - get token from Redux store (in-memory)
api.interceptors.request.use((config) => {
  if (store) {
    const state = store.getState();
    const token = state.auth.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor - auto refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            if (store) {
              const token = store.getState().auth.accessToken;
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Try to refresh token from Redux store
      if (store) {
        const state = store.getState();
        const refreshToken = state.auth.refreshToken;

        if (refreshToken) {
          try {
            const { data } = await axios.post(
              `${apiConfig.getConfig().baseUrl}${apiConfig.getConfig().endpoints.auth.refresh}`,
              { token: refreshToken }
            );

            // Dispatch to Redux to update tokens
            // Note: This will be handled by the component that catches this
            processQueue(null, data.accessToken);
            isRefreshing = false;

            // Update header and retry
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

            // Store will be updated by SessionRestorer or auth slice
            return api(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError as Error, null);
            isRefreshing = false;

            // Refresh failed - logout
            localStorage.removeItem("persist:auth");
            if (store) {
              const { handleSessionExpiry } = await import("../store/slices/authSlice");
              store.dispatch(handleSessionExpiry());
            }
            return Promise.reject(refreshError);
          }
        }
      }

      // No refresh token - logout
      isRefreshing = false;
      localStorage.removeItem("persist:auth");
      if (store) {
        const { handleSessionExpiry } = await import("../store/slices/authSlice");
        store.dispatch(handleSessionExpiry());
      }
    }

    return Promise.reject(error);
  }
);
