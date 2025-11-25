/**
 * API Configuration Manager
 * Handles different API backends: Mockoon and Production
 */

import axios from "axios";

export type ApiMode = "mockoon" | "production";

export interface ApiConfig {
  baseUrl: string;
  mode: ApiMode;
  endpoints: {
    auth: {
      login: string;
      refresh: string;
      logout: string;
      google: string;
    };
    emails: {
      list: string;
      get: (id: string) => string;
      update: (id: string) => string;
      create: string;
      delete: (id: string) => string;
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
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";
    const mode = (import.meta.env.VITE_API_MODE || "production") as ApiMode;

    return {
      baseUrl,
      mode,
      endpoints: this.getEndpoints(mode),
      headers: this.getHeaders(mode),
    };
  }

  private getEndpoints(mode: ApiMode) {
    switch (mode) {
      case "mockoon":
        return {
          auth: {
            login: "/auth/login",
            refresh: "/auth/refresh",
            logout: "/auth/logout",
            google: "/auth/google",
          },
          emails: {
            list: "/emails",
            get: (id: string) => `/emails/${id}`,
            update: (id: string) => `/emails/${id}`,
            create: "/emails",
            delete: (id: string) => `/emails/${id}`,
          },
        };

      case "production":
      default:
        return {
          auth: {
            login: "/api/auth/login",
            refresh: "/api/auth/refresh",
            logout: "/api/auth/logout",
            google: "/api/auth/google",
          },
          emails: {
            list: "/api/emails",
            get: (id: string) => `/api/emails/${id}`,
            update: (id: string) => `/api/emails/${id}`,
            create: "/api/emails",
            delete: (id: string) => `/api/emails/${id}`,
          },
        };
    }
  }

  private getHeaders(mode: ApiMode): Record<string, string> {
    const commonHeaders = {
      "Content-Type": "application/json",
    };

    switch (mode) {
      case "mockoon":
        return {
          ...commonHeaders,
          Accept: "application/json",
        };

      case "production":
      default:
        return {
          ...commonHeaders,
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        };
    }
  }

  public getConfig(): ApiConfig {
    return this.config;
  }

  public getFullUrl(endpoint: string): string {
    return `${this.config.baseUrl}${endpoint}`;
  }

  public isProduction(): boolean {
    return this.config.mode === "production";
  }

  public isMockMode(): boolean {
    return this.config.mode === "mockoon";
  }

  public getMode(): ApiMode {
    return this.config.mode;
  }

  // Method to log current configuration for debugging
  public logConfig(): void {
    if (import.meta.env.VITE_LOG_LEVEL === "debug") {
      console.group("🔧 API Configuration");
      console.log("Mode:", this.config.mode);
      console.log("Base URL:", this.config.baseUrl);
      console.log("Full Config:", this.config);
      console.groupEnd();
    }
  }
}

// Singleton instance
export const apiConfig = new ApiConfigManager();

// Create Axios instance
export const api = axios.create({
  baseURL: apiConfig.getConfig().baseUrl,
  headers: apiConfig.getConfig().headers,
  timeout: 10000,
});

// Request interceptor - add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token && !apiConfig.isMockMode()) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (import.meta.env.VITE_LOG_LEVEL === "debug") {
    console.log(
      `🌐 API Request [${apiConfig.getMode()}]:`,
      config.method?.toUpperCase(),
      config.url
    );
  }

  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
