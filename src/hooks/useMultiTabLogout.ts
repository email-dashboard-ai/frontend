import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppDispatch } from '../store';
import { clearTokens } from '../store/slices/authSlice';

/**
 * Multi-tab logout synchronization hook
 * 
 * Uses two methods for maximum compatibility:
 * 1. BroadcastChannel API (modern browsers) - Fast and efficient
 * 2. localStorage 'storage' event (fallback) - Works in older browsers
 * 
 * When user logs out in one tab, all other tabs are automatically logged out.
 * 
 * @example
 * // In a component inside Router context
 * function AppContent() {
 *   useMultiTabLogout();
 *   return <Routes>...</Routes>;
 * }
 */
export const useMultiTabLogout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    /**
     * Common logout handler for both BroadcastChannel and storage events
     */
    const handleLogout = () => {
      console.log('[Multi-tab Sync] Logout detected from another tab');
      
      // Clear tokens in THIS tab's Redux store
      dispatch(clearTokens());
      
      // Show notification to user
      toast.success('You have been logged out from another tab');
      
      // Redirect to login page
      navigate('/login', { replace: true });
    };

    // ========================================================================
    // Method 1: BroadcastChannel (Modern browsers - Chrome 54+, Firefox 38+)
    // ========================================================================
    let logoutChannel: BroadcastChannel | null = null;
    
    if ('BroadcastChannel' in window) {
      console.log('[Multi-tab Sync] BroadcastChannel supported, using it');
      
      logoutChannel = new BroadcastChannel('auth-logout');
      
      logoutChannel.onmessage = (event) => {
        if (event.data === 'logout') {
          handleLogout();
        }
      };
    } else {
      console.warn('[Multi-tab Sync] BroadcastChannel not supported, using storage event fallback');
    }

    // ========================================================================
    // Method 2: Storage Event (Fallback for older browsers)
    // ========================================================================
    /**
     * The 'storage' event fires when localStorage is modified in ANOTHER tab.
     * Note: It does NOT fire in the tab that made the change.
     * 
     * When persist:auth is removed (logout), event.newValue will be null.
     */
    const handleStorageChange = (event: StorageEvent) => {
      // Check if the auth data was removed (logout)
      if (event.key === 'persist:auth' && event.newValue === null) {
        handleLogout();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // ========================================================================
    // Cleanup on component unmount
    // ========================================================================
    return () => {
      if (logoutChannel) {
        logoutChannel.close();
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [dispatch, navigate]);
};
