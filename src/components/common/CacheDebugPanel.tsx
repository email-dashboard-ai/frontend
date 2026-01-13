/**
 * CacheDebugPanel Component
 * Developer tool to inspect offline cache status
 * Only visible in development mode
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  RefreshCw,
  Trash2,
  X,
  HardDrive,
  Mail,
  Tag,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { indexedDBService } from '../../services/indexedDBService';
import { useOffline } from '../../hooks/useOffline';

interface CacheStats {
  emailListCount: number;
  individualEmailCount: number;
  labelCount: number;
  pendingActionsCount: number;
  totalSize: string;
}

export const CacheDebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isOffline, pendingCount, syncStatus, triggerSync } = useOffline();

  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);

  // === CONFIG DISPLAY ===
  // Mặc định là ẨN. Muốn hiện, mở DevTools (F12) -> Console và gõ:
  // localStorage.setItem('debug_mode', 'true')
  // Sau đó reload trang.
  const [isVisible] = useState(() => localStorage.getItem('debug_mode') === 'true');

  if (!isVisible) return null;

  const refreshStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const newStats = await indexedDBService.getCacheStats();
      setStats(newStats);
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshStats();
    }
  }, [isOpen, refreshStats]);

  const handleClearExpired = async () => {
    await indexedDBService.clearExpiredCache();
    await refreshStats();
  };

  const toggleNetworkSimulation = (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Release focus so keyboard shortcuts (j/k) work immediately
    e?.currentTarget?.blur();

    const isGoingOffline = !isSimulatedOffline;
    setIsSimulatedOffline(isGoingOffline);

    // Override navigator.onLine property
    Object.defineProperty(navigator, 'onLine', {
      get: () => !isGoingOffline,
      configurable: true
    });

    // Dispatch event for window listeners
    window.dispatchEvent(new Event(isGoingOffline ? 'offline' : 'online'));

    // Force refresh useOffline hook
    setTimeout(() => {
      window.dispatchEvent(new Event(isGoingOffline ? 'offline' : 'online'));
    }, 100);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        title="Open Cache Debug Panel"
      >
        <Database size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-gray-900 text-white rounded-lg shadow-2xl overflow-hidden border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-blue-400" />
          <span className="font-semibold text-sm">Cache Debugger</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshStats}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Refresh Stats"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Network Simulator Bar */}
      <div className={`px-3 py-2 flex items-center justify-between text-xs transition-colors ${isOffline ? 'bg-red-900/30' : 'bg-green-900/30'
        }`}>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-500' : 'bg-green-500'
              }`}
          />
          <span className="font-medium">{isOffline ? 'Offline Mode' : 'Online Mode'}</span>
        </div>
        <button
          onClick={toggleNetworkSimulation}
          className={`text-[10px] px-2 py-0.5 rounded border ${isSimulatedOffline
            ? 'bg-green-600 border-green-500 text-white hover:bg-green-500'
            : 'bg-red-600 border-red-500 text-white hover:bg-red-500'
            }`}
        >
          {isSimulatedOffline ? 'Go Online' : 'Simulate Offline'}
        </button>
      </div>

      <div className="px-3 py-1 bg-gray-800/30 text-[10px] text-gray-400 flex justify-between">
        <span>Sync Status: <span className="text-gray-300">{syncStatus}</span></span>
        {pendingCount > 0 && <span className="text-yellow-400 font-bold">{pendingCount} pending actions</span>}
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              icon={<Mail size={14} />}
              label="Email Lists"
              subLabel="Cached Folders"
              value={stats.emailListCount}
            />
            <StatCard
              icon={<Mail size={14} />}
              label="Individual Emails"
              subLabel="Full content"
              value={stats.individualEmailCount}
            />
            <StatCard
              icon={<Tag size={14} />}
              label="Labels"
              subLabel="Folder structure"
              value={stats.labelCount}
            />
            <StatCard
              icon={<Clock size={14} />}
              label="Pending Actions"
              subLabel="Queued updates"
              value={stats.pendingActionsCount}
              highlight={stats.pendingActionsCount > 0}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-800 mt-2">
            <div className="flex items-center gap-1">
              <HardDrive size={12} />
              <span>Storage Used: {stats.totalSize}</span>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Actions */}
      <div className="border-t border-gray-700">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 flex items-center justify-between text-xs text-gray-400 hover:bg-gray-800 transition-colors"
        >
          <span>Tools & Actions</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 space-y-2 bg-gray-800/30">
            <button
              onClick={handleClearExpired}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition-colors"
            >
              <Trash2 size={12} className="text-gray-400" />
              Clear Expired Cache
            </button>
            <button
              onClick={triggerSync}
              disabled={isOffline || pendingCount === 0}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={12} />
              Force Sync Queue ({pendingCount})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
  value: number;
  highlight?: boolean;
}> = ({ icon, label, subLabel, value, highlight }) => (
  <div className={`flex items-start gap-2 p-2 rounded border ${highlight ? 'bg-yellow-900/20 border-yellow-700/50' : 'bg-gray-800 border-gray-700'
    }`}>
    <span className={`mt-0.5 ${highlight ? 'text-yellow-500' : 'text-gray-400'}`}>{icon}</span>
    <div>
      <div className="text-xs text-gray-300 font-medium">{label}</div>
      {subLabel && <div className="text-[10px] text-gray-500">{subLabel}</div>}
      <div className={`text-lg font-bold ${highlight ? 'text-yellow-400' : 'text-white'}`}>{value}</div>
    </div>
  </div>
);

export default CacheDebugPanel;
