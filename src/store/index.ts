import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import authReducer from './slices/authSlice';
import emailReducer from './slices/emailSlice';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // localStorage

/**
 * SECURITY BEST PRACTICES FOR TOKEN MANAGEMENT:
 * 
 * ✅ Access Token: NEVER persisted, only in memory (Redux state)
 * ✅ Refresh Token: Managed separately in localStorage via authService
 * ✅ User Data: Not persisted in Redux for security
 * ✅ Auto-logout: On token expiration or manual logout
 * 
 * This follows OWASP recommendations for SPA security
 */

// Persist config for auth (SECURITY: Never persist access token)
const authPersistConfig = {
  key: 'auth',
  storage,
  blacklist: ['accessToken', 'user', 'isLoading', 'error'], // Never persist sensitive data
  whitelist: ['isAuthenticated', 'refreshToken'], // Persist auth state & refresh token
};

// Persist config for email preferences
const emailPersistConfig = {
  key: 'email',
  storage,
  whitelist: ['searchQuery'], // Only persist search query
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedEmailReducer = persistReducer(emailPersistConfig, emailReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    email: persistedEmailReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;