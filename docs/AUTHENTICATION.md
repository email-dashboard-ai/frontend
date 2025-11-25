# 🔐 Authentication Guide

## 🎯 Authentication Flow

```
┌──────────┐      ┌────────────┐      ┌──────────┐      ┌─────────┐
│  User    │─────▶│ LoginPage  │─────▶│ Redux    │─────▶│ Service │
│          │      │            │      │ Thunk    │      │         │
└──────────┘      └────────────┘      └──────────┘      └────┬────┘
                                                               │
                                                               ▼
┌──────────┐      ┌────────────┐      ┌──────────┐      ┌─────────┐
│ Redirect │◀─────│ Redux      │◀─────│ Response │◀─────│ Mockoon │
│ /inbox   │      │ Save State │      │          │      │ API     │
└──────────┘      └────────────┘      └──────────┘      └─────────┘
```

---

## 🔑 Token Management

### **Token Storage Strategy**

| Token Type | Storage | Lifetime | Purpose |
|-----------|---------|----------|---------|
| **accessToken** | Memory only (Redux) | 15-30 min | API requests |
| **refreshToken** | localStorage | 7-30 days | Refresh access token |
| **isAuthenticated** | localStorage (persisted) | Permanent | Route guards |

### **Why this strategy?**

- ✅ **accessToken in memory** → Không bị XSS attack
- ✅ **refreshToken in localStorage** → Auto refresh khi reload page
- ✅ **isAuthenticated persisted** → Route guards work sau reload

---

## 📡 Current Setup (Mockoon)

### **Login Endpoint**

**URL:** `POST http://localhost:3001/auth/login`

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "1",
    "email": "admin@example.com",
    "name": "Admin User",
    "avatar": "A"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh_token_abc123..."
  }
}
```

### **Google Login Endpoint**

**URL:** `POST http://localhost:3001/auth/google`

**Request:**
```json
{
  "credential": "google-credential-token",
  "clientId": "google-client-id"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "google_123",
    "email": "user@gmail.com",
    "name": "Google User",
    "avatar": "GU"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "google_refresh_xyz..."
  }
}
```

### **Refresh Token Endpoint**

**URL:** `POST http://localhost:3001/auth/refresh`

**Request:**
```json
{
  "refreshToken": "refresh_token_abc123..."
}
```

**Response:**
```json
{
  "success": true,
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh_token_new456..."
  }
}
```

### **Logout Endpoint**

**URL:** `POST http://localhost:3001/auth/logout`

**Request:**
```json
{
  "refreshToken": "refresh_token_abc123..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 🔒 Axios Interceptors

### **Request Interceptor** (Auto Token Injection)

```ts
// src/config/apiConfig.ts
api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  
  if (token && !apiConfig.isMockMode()) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});
```

### **Response Interceptor** (Auto 401 Handling)

```ts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear auth state
      store.dispatch(logout());
      
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## 🛡️ Route Guards

### **ProtectedRoute** (Requires Authentication)

```tsx
// src/components/auth/ProtectedRoute.tsx
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAppSelector(state => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

**Usage:**
```tsx
<Route path="/inbox" element={
  <ProtectedRoute>
    <InboxPage />
  </ProtectedRoute>
} />
```

### **PublicRoute** (Redirects if Authenticated)

```tsx
// src/components/auth/PublicRoute.tsx
export const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAppSelector(state => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/inbox" replace />;
  }

  return <>{children}</>;
};
```

**Usage:**
```tsx
<Route path="/login" element={
  <PublicRoute>
    <LoginPage />
  </PublicRoute>
} />
```

---

## 🔄 Migration to Production

### **1. Update Environment Variables**

```bash
# .env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_API_MODE=production
```

### **2. Check Response Format**

Nếu backend trả format khác, sửa trong `authService.ts`:

```ts
// src/services/authService.ts
async loginWithEmail(credentials) {
  const { data } = await api.post(config.endpoints.auth.login, credentials);
  
  // Map response nếu format khác
  return {
    user: data.user || data.profile,
    accessToken: data.tokens?.accessToken || data.token,
    refreshToken: data.tokens?.refreshToken || data.refresh,
  };
}
```

### **3. Setup Real Google OAuth**

#### **Install Library**
```bash
npm install @react-oauth/google
```

#### **Wrap App with Provider**
```tsx
// src/main.tsx
import { GoogleOAuthProvider } from '@react-oauth/google';

<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
  <App />
</GoogleOAuthProvider>
```

#### **Replace Mock Button**
```tsx
// src/pages/LoginPage.tsx
import { GoogleLogin } from '@react-oauth/google';

// BEFORE (Mock)
<Button onClick={handleGoogleSignIn}>
  Sign in with Google
</Button>

// AFTER (Real)
<GoogleLogin
  onSuccess={(credentialResponse) => {
    dispatch(loginWithGoogle(credentialResponse));
  }}
  onError={() => {
    console.error('Google login failed');
  }}
/>
```

### **4. Backend Requirements**

Backend cần implement:

- `POST /api/v1/auth/login` - Email/password login
- `POST /api/v1/auth/google` - Google OAuth login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Invalidate refresh token
- `GET /api/v1/auth/me` - Get current user info

**Token format:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## ✅ Security Best Practices

| Practice | Implementation | Status |
|----------|----------------|--------|
| **XSS Protection** | accessToken in memory only | ✅ |
| **CSRF Protection** | Use httpOnly cookies (backend) | 🟡 |
| **Token Expiry** | Short-lived access tokens | ✅ |
| **Auto Refresh** | refreshToken endpoint | ✅ |
| **Secure Storage** | No sensitive data in localStorage | ✅ |
| **HTTPS Only** | Force HTTPS in production | 🟡 |
| **Auto Logout** | 401 → clear state + redirect | ✅ |

---

## 🧪 Testing Authentication

### **Test Login Flow**

1. Start Mockoon server
2. Go to `/login`
3. Enter credentials:
   - Email: `admin@example.com`
   - Password: `password123`
4. Click "Sign In"
5. Should redirect to `/inbox`
6. Check Redux DevTools → `auth.isAuthenticated = true`

### **Test Protected Routes**

1. Logout (clear auth state)
2. Try to access `/inbox` directly
3. Should redirect to `/login`

### **Test Token Refresh**

1. Login successfully
2. Wait for token expiry (mock: 15 min)
3. Make API request
4. Should auto refresh and retry

### **Test Logout**

1. Click logout button
2. Should clear localStorage
3. Should redirect to `/login`
4. Try to access `/inbox` → redirect to login
