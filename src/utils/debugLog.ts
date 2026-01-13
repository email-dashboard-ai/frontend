/**
 * Debug Logger Utility
 * Only logs in development mode, silent in production
 */

const isDev = import.meta.env.DEV;

// Enable verbose IndexedDB logging
const VERBOSE_INDEXEDDB = isDev && false; // Set to true for debugging

export const debugLog = {
  /**
   * IndexedDB cache operations
   */
  cache: (message: string, ...args: unknown[]) => {
    if (VERBOSE_INDEXEDDB) {
      console.log(`[Cache] ${message}`, ...args);
    }
  },

  /**
   * Offline-related operations
   */
  offline: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`[Offline] ${message}`, ...args);
    }
  },

  /**
   * Warning messages (always shown in dev)
   */
  warn: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.warn(message, ...args);
    }
  },

  /**
   * Error messages (always shown)
   */
  error: (message: string, ...args: unknown[]) => {
    console.error(message, ...args);
  },
};

export default debugLog;
