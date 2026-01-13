/**
 * OfflineBanner Component
 * Displays offline status indicator and pending actions info
 * Shows sync progress and allows manual retry
 */

import React, { useState, useEffect } from 'react';
import {
  WifiOff,
  Wifi,
  CloudOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
} from 'lucide-react';
import { useOffline } from '../../hooks/useOffline';

interface OfflineBannerProps {
  /** Position of the banner */
  position?: 'top' | 'bottom';
  /** Whether to show pending actions count */
  showPendingCount?: boolean;
  /** Whether banner can be dismissed */
  dismissible?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  position = 'top',
  showPendingCount = true,
  dismissible = false,
}) => {
  const {
    isOffline,
    syncStatus,
    pendingCount,
    hasPendingActions,
    triggerSync,
    retryFailed,
  } = useOffline();

  const [isDismissed, setIsDismissed] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [prevPendingCount, setPrevPendingCount] = useState(pendingCount);

  // Reset dismissed state when going offline
  useEffect(() => {
    if (isOffline) {
      setIsDismissed(false);
    }
  }, [isOffline]);

  // Show success toast when sync completes
  useEffect(() => {
    if (prevPendingCount > 0 && pendingCount === 0 && !isOffline) {
      setShowSuccessToast(true);
      const timer = setTimeout(() => setShowSuccessToast(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevPendingCount(pendingCount);
  }, [pendingCount, isOffline, prevPendingCount]);

  // Don't show if online with no pending actions (unless showing success)
  if (!isOffline && !hasPendingActions && !showSuccessToast && syncStatus === 'idle') {
    return null;
  }

  // Don't show if dismissed (only when online)
  if (isDismissed && !isOffline) {
    return null;
  }

  const handleSync = async () => {
    await triggerSync();
  };

  const handleRetry = async () => {
    await retryFailed();
  };

  const positionClasses = position === 'top'
    ? 'top-0 left-0 right-0'
    : 'bottom-0 left-0 right-0';

  // Success toast
  if (showSuccessToast) {
    return (
      <div
        className={`fixed ${positionClasses} z-50 transform transition-all duration-300`}
      >
        <div className="bg-green-500 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg">
          <CheckCircle size={18} />
          <span className="text-sm font-medium">All changes synced successfully!</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed ${positionClasses} z-50 transform transition-all duration-300`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`
          ${isOffline ? 'bg-yellow-500' : syncStatus === 'error' ? 'bg-red-500' : 'bg-blue-500'}
          text-white px-4 py-2 flex items-center justify-between shadow-lg
        `}
      >
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          {isOffline ? (
            <WifiOff size={18} className="flex-shrink-0" />
          ) : syncStatus === 'syncing' ? (
            <RefreshCw size={18} className="flex-shrink-0 animate-spin" />
          ) : syncStatus === 'error' ? (
            <AlertCircle size={18} className="flex-shrink-0" />
          ) : (
            <CloudOff size={18} className="flex-shrink-0" />
          )}

          {/* Status Text */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="text-sm font-medium">
              {isOffline
                ? "You're offline — viewing cached emails"
                : syncStatus === 'syncing'
                  ? 'Syncing changes...'
                  : syncStatus === 'error'
                    ? 'Some changes failed to sync'
                    : 'Pending changes'}
            </span>

            {/* Pending Count */}
            {showPendingCount && hasPendingActions && (
              <span className="text-xs opacity-90 flex items-center gap-1">
                <Clock size={12} />
                {pendingCount} action{pendingCount !== 1 ? 's' : ''} queued
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Sync/Retry Button */}
          {!isOffline && hasPendingActions && syncStatus !== 'syncing' && (
            <button
              onClick={syncStatus === 'error' ? handleRetry : handleSync}
              className="
                flex items-center gap-1 px-3 py-1 rounded
                bg-white/20 hover:bg-white/30 
                text-sm font-medium transition-colors
                focus:outline-none focus:ring-2 focus:ring-white/50
              "
              aria-label={syncStatus === 'error' ? 'Retry sync' : 'Sync now'}
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">
                {syncStatus === 'error' ? 'Retry' : 'Sync'}
              </span>
            </button>
          )}

          {/* Online indicator when pending */}
          {!isOffline && hasPendingActions && (
            <div className="flex items-center gap-1 text-xs opacity-75">
              <Wifi size={12} />
              <span className="hidden sm:inline">Online</span>
            </div>
          )}

          {/* Dismiss Button */}
          {dismissible && !isOffline && (
            <button
              onClick={() => setIsDismissed(true)}
              className="
                p-1 rounded hover:bg-white/20 
                transition-colors focus:outline-none 
                focus:ring-2 focus:ring-white/50
              "
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Compact offline indicator for header/navbar
 */
export const OfflineIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isOffline, hasPendingActions, pendingCount, syncStatus } = useOffline();

  if (!isOffline && !hasPendingActions) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      title={
        isOffline
          ? 'You are offline'
          : `${pendingCount} pending action${pendingCount !== 1 ? 's' : ''}`
      }
    >
      {isOffline ? (
        <WifiOff size={16} className="text-yellow-500" />
      ) : syncStatus === 'syncing' ? (
        <RefreshCw size={16} className="text-blue-500 animate-spin" />
      ) : syncStatus === 'error' ? (
        <AlertCircle size={16} className="text-red-500" />
      ) : (
        <CloudOff size={16} className="text-blue-500" />
      )}
      {hasPendingActions && (
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {pendingCount}
        </span>
      )}
    </div>
  );
};

export default OfflineBanner;
