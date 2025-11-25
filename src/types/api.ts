export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  statusCode: number;
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