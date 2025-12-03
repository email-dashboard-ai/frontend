export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSessionExpired: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface GoogleAuthResponse {
  credential: string;
  clientId?: string;
}

export interface GoogleAuthRequest {
  authCode: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
