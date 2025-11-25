# Google OAuth Integration Guide

This guide explains how to integrate Google OAuth2 authentication with your React TypeScript frontend and Java Spring Boot backend.

## Overview

The integration uses the Authorization Code flow, which is the most secure OAuth2 flow for web applications:

1. **Frontend**: User clicks "Sign in with Google"
2. **Google**: Returns a one-time authorization code
3. **Frontend**: Sends the code to your backend
4. **Backend**: Exchanges the code for access and refresh tokens
5. **Backend**: Stores tokens and returns JWT to frontend

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to **APIs & Services > Library**
   - Search for "Gmail API" and enable it
4. Configure OAuth2:
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth 2.0 Client IDs**
   - Choose **Web application**
   - Add authorized JavaScript origins:
     - `http://localhost:3000` (Vite dev server)
     - `http://localhost:5173` (if using default port)
   - Add authorized redirect URIs:
     - `http://localhost:3000`
     - `http://localhost:5173`
5. Copy the **Client ID** (format: `xxxxxx.apps.googleusercontent.com`)

### 2. Frontend Configuration

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Update your `.env` file:
   ```env
   VITE_GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
   VITE_API_BASE_URL=http://localhost:8081
   VITE_API_MODE=production
   ```

### 3. Backend Configuration

Make sure your Spring Boot backend has the corresponding endpoint that matches:

```java
@PostMapping("/api/auth/google")
public ResponseEntity<AuthResponse> googleAuth(@RequestBody GoogleAuthRequest request) {
    // Your implementation
}
```

The request body should expect:

```json
{
  "authCode": "4/0AX4XfWh..."
}
```

### 4. Scopes Configuration

The frontend requests these scopes:

- `https://www.googleapis.com/auth/gmail.readonly` - Read Gmail messages

You can modify the scopes in `GoogleLoginButton.tsx` if you need different permissions.

## How It Works

### Frontend Flow

1. **GoogleLoginButton Component**:

   - Uses `@react-oauth/google` library
   - Configured with `flow: 'auth-code'`
   - Requests Gmail readonly scope

2. **Auth Code Exchange**:

   ```typescript
   const handleGoogleLogin = useGoogleLogin({
     flow: "auth-code",
     scope: "https://www.googleapis.com/auth/gmail.readonly",
     onSuccess: async (codeResponse) => {
       // Send codeResponse.code to backend
       dispatch(loginWithGoogle({ authCode: codeResponse.code }));
     },
   });
   ```

3. **Redux Integration**:
   - Action: `loginWithGoogle({ authCode })`
   - Service: `authService.loginWithGoogle(request)`
   - API call: `POST /api/auth/google`

### Backend Integration

Your backend should:

1. **Receive the auth code**:

   ```java
   @Data
   public class GoogleAuthRequest {
       private String authCode;
   }
   ```

2. **Exchange for tokens**:

   ```java
   // Use Google's client library to exchange code for tokens
   GoogleAuthorizationCodeTokenRequest tokenRequest =
       new GoogleAuthorizationCodeTokenRequest(...);
   GoogleTokenResponse tokenResponse = tokenRequest.execute();
   ```

3. **Return response**:
   ```java
   @Data
   public class AuthResponse {
       private String accessToken;    // Your app's JWT
       private String refreshToken;   // Your app's refresh token
       private User user;
   }
   ```

## Testing

1. **Start your backend**: `mvn spring-boot:run` (port 8081)
2. **Start frontend**: `npm run dev` (port 3000)
3. **Click "Sign in with Google"**
4. **Check browser console** for debug logs
5. **Verify tokens** are stored in localStorage

## Troubleshooting

### Common Issues

1. **"Invalid Client ID"**:

   - Check `VITE_GOOGLE_CLIENT_ID` in `.env`
   - Verify the Client ID in Google Cloud Console

2. **CORS Errors**:

   - Add your frontend URL to authorized origins
   - Check backend CORS configuration

3. **"redirect_uri_mismatch"**:

   - Add your frontend URL to authorized redirect URIs
   - Make sure the ports match

4. **Backend Errors**:
   - Check network tab for API response
   - Verify endpoint URL matches: `POST /api/auth/google`
   - Check request body format

### Debug Mode

Enable debug logging by setting:

```env
VITE_LOG_LEVEL=debug
```

This will show:

- API requests and responses
- Google OAuth flow steps
- Token storage events

## Security Notes

- **Never expose** your Google Client Secret in frontend code
- **Use HTTPS** in production
- **Validate tokens** on the backend
- **Store refresh tokens** securely on the backend
- **Implement token rotation** for long-term security

## File Structure

```
src/
├── components/auth/
│   └── GoogleLoginButton.tsx     # Google OAuth button
├── services/
│   └── authService.ts           # API calls
├── store/slices/
│   └── authSlice.ts            # Redux logic
├── types/
│   └── auth.ts                 # TypeScript types
└── main.tsx                    # OAuth provider setup
```
