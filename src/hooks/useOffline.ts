/**
 * useOffline Hook
 * Provides offline status and pending actions tracking for UI components
 * Implements reactive network status detection
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineService, SyncStatus } from '../services/offlineService';
import { indexedDBService } from '../services/indexedDBService';

interface UseOfflineReturn {
  /** Whether the app is currently offline */
  isOffline: boolean;
  /** Current sync status */
  syncStatus: SyncStatus;
  /** Number of pending actions in queue */
  pendingCount: number;
  /** Whether there are any pending actions */
  hasPendingActions: boolean;
  /** Manually trigger sync (when online) */
  triggerSync: () => Promise<void>;
  /** Retry all failed actions */
  retryFailed: () => Promise<void>;
  /** Clear all failed actions */
  clearFailed: () => Promise<void>;
  /** Get cache statistics */
  getCacheStats: () => Promise<{
    emailListCount: number;
    individualEmailCount: number;
    labelCount: number;
    pendingActionsCount: number;
    totalSize: string;
  }>;
}

/**
 * Hook to track offline status and manage offline queue
 */
export function useOffline(): UseOfflineReturn {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    // Get initial pending count
    indexedDBService.getPendingActionsCount()
      .then(setPendingCount)
      .catch(console.error);

    // Subscribe to offline service events
    const unsubStatus = offlineService.on('statusChange', ({ isOffline }) => {
      setIsOffline(isOffline);
      if (isOffline) {
        setSyncStatus('offline');
      }
    });

    const unsubPending = offlineService.on('pendingCountChange', ({ count }) => {
      setPendingCount(count);
    });

    const unsubComplete = offlineService.on('syncComplete', () => {
      setSyncStatus('idle');
    });

    const unsubError = offlineService.on('syncError', () => {
      setSyncStatus('error');
    });

    // Native online/offline events as backup
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubStatus();
      unsubPending();
      unsubComplete();
      unsubError();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    if (!isOffline) {
      setSyncStatus('syncing');
      await offlineService.processQueue();
    }
  }, [isOffline]);

  const retryFailed = useCallback(async () => {
    await offlineService.retryFailedActions();
  }, []);

  const clearFailed = useCallback(async () => {
    await offlineService.clearFailedActions();
  }, []);

  const getCacheStats = useCallback(async () => {
    return indexedDBService.getCacheStats();
  }, []);

  return {
    isOffline,
    syncStatus,
    pendingCount,
    hasPendingActions: pendingCount > 0,
    triggerSync,
    retryFailed,
    clearFailed,
    getCacheStats,
  };
}

/**
 * Simplified hook for just checking offline status
 */
export function useIsOffline(): boolean {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
}

export default useOffline;
