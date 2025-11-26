import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import authReducer from './slices/authSlice';
import emailReducer from './slices/emailSlice';
import gmailReducer from './slices/gmailSlice';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Persist config for auth
const authPersistConfig = {
  key: 'auth',
  storage,
  blacklist: ['accessToken', 'user', 'isLoading', 'error'],
  whitelist: ['isAuthenticated', 'refreshToken'],
};

// Persist config for email
const emailPersistConfig = {
  key: 'email',
  storage,
  whitelist: ['searchQuery'],
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedEmailReducer = persistReducer(emailPersistConfig, emailReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    email: persistedEmailReducer,
    gmail: gmailReducer,
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

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;