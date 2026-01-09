/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  errorCode: number;
  statusCode?: number; // Optional as it might not be in the body
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ErrorResponse {
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
}

export type LoadingState = 'idle' | 'pending' | 'succeeded' | 'failed';