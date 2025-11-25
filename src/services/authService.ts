import type {
  AuthResponse,
  LoginCredentials,
  GoogleAuthRequest,
  User,
} from "../types/auth";
import { TOKEN_KEYS } from "../constants";
import { apiConfig, api } from "../config/apiConfig";

class AuthService {
  constructor() {
    // Log API configuration on service initialization
    apiConfig.logConfig();
  }

  async loginWithEmail(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const config = apiConfig.getConfig();
      const { data } = await api.post(config.endpoints.auth.login, credentials);

      // Handle API response format
      if (data.success && data.user && data.tokens) {
        const authResponse: AuthResponse = {
          user: data.user,
          accessToken: data.tokens.accessToken,
          refreshToken: data.tokens.refreshToken,
        };

        localStorage.setItem(
          TOKEN_KEYS.REFRESH_TOKEN,
          authResponse.refreshToken
        );
        localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);

        return authResponse;
      } else {
        throw new Error(data.message || "Authentication failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw new Error("Network error or invalid credentials");
    }
  }

  async loginWithGoogle(request: GoogleAuthRequest): Promise<AuthResponse> {
    try {
      const config = apiConfig.getConfig();
      console.log("Sending auth code to backend:", request.authCode);

      // Send the auth code to your backend - matches your Java DTO
      const { data } = await api.post(config.endpoints.auth.google, {
        authCode: request.authCode,
      });

      console.log("Backend Google auth response:", data);

      // Handle different response formats from your backend
      let authResponse: AuthResponse;

      if (data.accessToken && data.refreshToken) {
        // Direct response format
        authResponse = {
          user: data.user || {
            id: data.userId || "google-user",
            email: data.email || "user@gmail.com",
            name: data.name || "Google User",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        };
      } else if (data.success && data.tokens) {
        // Wrapped response format
        authResponse = {
          user: data.user,
          accessToken: data.tokens.accessToken,
          refreshToken: data.tokens.refreshToken,
        };
      } else {
        throw new Error(data.message || "Google authentication failed");
      }

      // Store tokens
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, authResponse.accessToken);
      localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, authResponse.refreshToken);

      return authResponse;
    } catch (error) {
      console.error("Google login error:", error);
      if (error instanceof Error) {
        throw new Error(`Google login failed: ${error.message}`);
      }
      throw new Error("Google login failed");
    }
  }

  async refreshToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const config = apiConfig.getConfig();
    const { data } = await api.post(config.endpoints.auth.refresh, {
      refreshToken,
    });

    const tokens = {
      accessToken: data.tokens?.accessToken || data.accessToken,
      refreshToken: data.tokens?.refreshToken || data.refreshToken,
    };

    localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);

    return tokens;
  }

  async logout(): Promise<void> {
    try {
      const config = apiConfig.getConfig();
      const refreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);

      if (refreshToken) {
        await api.post(config.endpoints.auth.logout, { refreshToken });
      }
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      // Always clear local storage
      localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
      localStorage.removeItem("persist:auth");
    }
  }

  async getCurrentUser(): Promise<User> {
    const config = apiConfig.getConfig();
    const { data } = await api.get(`${config.baseUrl}/auth/me`);
    return data.user || data;
  }
}

export const authService = new AuthService();
