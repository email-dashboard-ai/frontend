import { useAppDispatch, useAppSelector } from '../store';
import { logout, clearError } from '../store/slices/authSlice';

/**
 * Custom hook quản lý authentication logic
 * - User info
 * - Logout
 * - Error handling
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading, error } = useAppSelector(state => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleClearError = () => {
    dispatch(clearError());
  };

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    
    // Actions
    handleLogout,
    handleClearError,
  };
};
