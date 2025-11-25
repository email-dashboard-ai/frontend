# 🔌 Hướng dẫn Tích hợp API

## 📌 Thêm API Mới - 5 Bước

Ví dụ: Thêm API quản lý **User Profile** (getProfile, updateProfile, deleteProfile)

---

### **1️⃣ Định nghĩa Type**

Tạo file: `src/types/profile.ts`

```ts
// src/types/profile.ts
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}
```

Sau đó export trong `src/types/index.ts`:
```ts
export * from './profile';
```

---

### **2️⃣ Định nghĩa Service Class**

Tạo file: `src/services/profileService.ts`

```ts
// src/services/profileService.ts
import type { UserProfile } from '../types';
import { apiConfig, api } from '../config/apiConfig';

class ProfileService {
  constructor() {
    apiConfig.logConfig();
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const config = apiConfig.getConfig();
    const { data } = await api.get(config.endpoints.profile.get(userId));
    return data.profile || data;
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const config = apiConfig.getConfig();
    const { data } = await api.patch(config.endpoints.profile.update(userId), updates);
    return data.profile || data;
  }

  async deleteProfile(userId: string): Promise<void> {
    const config = apiConfig.getConfig();
    await api.delete(config.endpoints.profile.delete(userId));
  }
}

export const profileService = new ProfileService();
```

Export trong `src/services/index.ts`:
```ts
export { profileService } from './profileService';
```

**Pattern:**
- Lấy `config` từ `apiConfig.getConfig()`
- Dùng `config.endpoints.profile.*` để access endpoint (tự động switch mockoon ↔ production)
- Handle response format (một số API trả `data.profile`, một số trả `data` trực tiếp)
- Error → throw ra, để Redux thunk xử lý

---

### **3️⃣ Tạo Redux Slice (async thunks + reducers)**

Tạo file: `src/store/slices/profileSlice.ts`

```ts
// src/store/slices/profileSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { UserProfile, ProfileState } from '../../types';
import { profileService } from '../../services';

const initialState: ProfileState = {
  profile: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchProfile = createAsyncThunk(
  'profile/fetchProfile',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await profileService.getProfile(userId);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch profile');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'profile/updateProfile',
  async ({ userId, updates }: { userId: string; updates: Partial<UserProfile> }, { rejectWithValue }) => {
    try {
      return await profileService.updateProfile(userId, updates);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update profile');
    }
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      });
  },
});

export const { clearError } = profileSlice.actions;
export default profileSlice.reducer;
```

Đăng ký trong `src/store/index.ts`:
```ts
import profileReducer from './slices/profileSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    email: emailReducer,
    profile: profileReducer,  // ← Thêm dòng này
  },
  // ...
});
```

---

### **4️⃣ Tạo Custom Hook (Optional nhưng recommended)**

Tạo file: `src/hooks/useProfile.ts`

```ts
// src/hooks/useProfile.ts
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchProfile, updateProfile, clearError } from '../store/slices/profileSlice';
import type { UserProfile } from '../types';

export const useProfile = (userId?: string) => {
  const dispatch = useAppDispatch();
  const { profile, isLoading, error } = useAppSelector(state => state.profile);

  // Auto fetch on mount if userId provided
  useEffect(() => {
    if (userId) {
      dispatch(fetchProfile(userId));
    }
  }, [userId, dispatch]);

  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    if (userId) {
      dispatch(updateProfile({ userId, updates }));
    }
  };

  const handleClearError = () => {
    dispatch(clearError());
  };

  return {
    profile,
    isLoading,
    error,
    handleUpdateProfile,
    handleClearError,
  };
};
```

---

### **5️⃣ Sử dụng trong Component**

```tsx
// src/pages/ProfilePage.tsx
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';

const ProfilePage = () => {
  const { user } = useAuth();
  const { 
    profile, 
    isLoading, 
    error,
    handleUpdateProfile 
  } = useProfile(user?.id);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!profile) return <div>No profile found</div>;

  return (
    <div>
      <h1>{profile.name}</h1>
      <button onClick={() => handleUpdateProfile({ bio: 'New bio' })}>
        Update Bio
      </button>
    </div>
  );
};

export default ProfilePage;
```

---

### **6️⃣ Cấu hình Endpoints (apiConfig.ts)**

Cập nhật `src/config/apiConfig.ts`:

```ts
// src/config/apiConfig.ts
endpoints: {
  auth: {
    login: '/auth/login',
    google: '/auth/google',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
  },
  emails: {
    list: '/emails',
    get: (id: string) => `/emails/${id}`,
    create: '/emails',
    update: (id: string) => `/emails/${id}`,
    delete: (id: string) => `/emails/${id}`,
  },
  profile: {  // ← Thêm section mới
    get: (userId: string) => `/users/${userId}/profile`,
    update: (userId: string) => `/users/${userId}/profile`,
    delete: (userId: string) => `/users/${userId}/profile`,
  },
},
```

---

### **7️⃣ Thêm vào Mockoon Config**

Cập nhật `mockoon-config.json`:

```json
{
  "uuid": "...",
  "routes": [
    // ... existing routes
    {
      "uuid": "profile-get",
      "type": "http",
      "method": "get",
      "endpoint": "users/:userId/profile",
      "responses": [{
        "statusCode": 200,
        "body": "{\n  \"success\": true,\n  \"profile\": {\n    \"id\": \"{{urlParam 'userId'}}\",\n    \"name\": \"John Doe\",\n    \"email\": \"john@example.com\",\n    \"avatar\": \"JD\",\n    \"bio\": \"Software Developer\",\n    \"createdAt\": \"{{now}}\",\n    \"updatedAt\": \"{{now}}\"\n  }\n}"
      }]
    },
    {
      "uuid": "profile-update",
      "type": "http",
      "method": "patch",
      "endpoint": "users/:userId/profile",
      "responses": [{
        "statusCode": 200,
        "body": "{\n  \"success\": true,\n  \"profile\": {\n    \"id\": \"{{urlParam 'userId'}}\",\n    \"name\": \"{{body 'name'}}\",\n    \"bio\": \"{{body 'bio'}}\",\n    \"updatedAt\": \"{{now}}\"\n  }\n}"
      }]
    }
  ]
}
```

---

## ✅ Checklist

- [ ] Tạo types trong `src/types/`
- [ ] Tạo service trong `src/services/`
- [ ] Tạo Redux slice trong `src/store/slices/`
- [ ] Tạo custom hook trong `src/hooks/` (optional)
- [ ] Sử dụng trong component/page
- [ ] Thêm endpoints vào `apiConfig.ts`
- [ ] Thêm routes vào `mockoon-config.json`
- [ ] Test với Mockoon server
- [ ] Kiểm tra TypeScript errors
- [ ] Test loading/error states

---

## 🔄 Khi chuyển sang Production

Chỉ cần:

1. **Update `.env`**
```bash
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_API_MODE=production
```

2. **Kiểm tra response format** (nếu khác Mockoon)
```ts
// Chỉ sửa trong service nếu cần
return data.profile || data.data || data;
```

**Frontend code khác → KHÔNG CẦN SỬA!**
