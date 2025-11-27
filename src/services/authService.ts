import { jwtDecode } from "jwt-decode";
import type {
  AuthResponse,
  LoginCredentials,
  GoogleAuthRequest,
  RegisterRequest,
  User,
} from "../types/auth";
import { apiConfig, api } from "../config/apiConfig";
import type { ApiResponse } from "../types/api";

interface BackendAuthResponse {
  accessToken: string;
  refreshToken: string;
}

interface DecodedToken {
  sub: string; // email
  iat: number;
  exp: number;
  // Add other claims if known
  name?: string;
  userId?: string;
}

class AuthService {
  private getUserFromToken(accessToken: string): User {
    try {
      const decoded = jwtDecode<DecodedToken>(accessToken);
      return {
        id: decoded.userId || decoded.sub, // Fallback to email as ID if userId is missing
        email: decoded.sub,
        name: decoded.name || decoded.sub.split('@')[0], // Fallback to email prefix
        createdAt: new Date().toISOString(), // Dummy date
        updatedAt: new Date().toISOString(), // Dummy date
      };
    } catch (error) {
      console.error("Failed to decode token:", error);
      throw new Error("Invalid token");
    }
  }

  private handleAuthResponse(data: BackendAuthResponse): AuthResponse {
    if (!data.accessToken || !data.refreshToken) {
      throw new Error("Invalid response from server");
    }

    const user = this.getUserFromToken(data.accessToken);

    // ✅ ASSIGNMENT REQUIREMENT: Access token in-memory ONLY
    // ✅ Refresh token persisted via Redux Persist
    // NO localStorage for access_token

    return {
      user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  }

  async register(request: RegisterRequest): Promise<AuthResponse> {
    try {
      const config = apiConfig.getConfig();
      const { data } = await api.post<ApiResponse<BackendAuthResponse>>(
        config.endpoints.auth.register,
        request
      );
      return this.handleAuthResponse(data.data);
    } catch (error: any) {
      console.error("Registration error:", error);
      throw new Error(error.response?.data?.message || "Registration failed");
    }
  }

  async loginWithEmail(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const config = apiConfig.getConfig();
      const { data } = await api.post<ApiResponse<BackendAuthResponse>>(
        config.endpoints.auth.login,
        credentials
      );
      return this.handleAuthResponse(data.data);
    } catch (error: any) {
      console.error("Login error:", error);
      throw new Error(error.response?.data?.message || "Invalid credentials");
    }
  }

  async loginWithGoogle(request: GoogleAuthRequest): Promise<AuthResponse> {
    try {
      const config = apiConfig.getConfig();
      const { data } = await api.post<ApiResponse<BackendAuthResponse>>(
        config.endpoints.auth.google,
        { authCode: request.authCode }
      );
      return this.handleAuthResponse(data.data);
    } catch (error: any) {
      console.error("Google login error:", error);
      throw new Error(error.response?.data?.message || "Google login failed");
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const config = apiConfig.getConfig();
    const { data } = await api.post<ApiResponse<BackendAuthResponse>>(
      config.endpoints.auth.refresh,
      { token: refreshToken }
    );

    // Return tokens to Redux - NO localStorage
    return data.data;
  }

  async logout(): Promise<void> {
    try {
      const config = apiConfig.getConfig();
      await api.post(config.endpoints.auth.logout);
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      // Clear refresh token from persist
      localStorage.removeItem("persist:auth");
    }
  }

  getUserFromAccessToken(accessToken: string): User {
    return this.getUserFromToken(accessToken);
  }
}

export const authService = new AuthService();
