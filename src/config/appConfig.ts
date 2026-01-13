export const appConfig = {
    gmail: {
        defaultPageLimit: 20,
    },

    // Offline caching configuration
    offline: {
        // Cache duration in milliseconds
        cacheDuration: {
            online: 5 * 60 * 1000,    // 5 minutes when online
            offline: 24 * 60 * 60 * 1000, // 24 hours when offline
        },

        // Pending actions queue
        queue: {
            maxRetries: 3,
            initialRetryDelay: 1000,   // 1 second
            maxRetryDelay: 30000,      // 30 seconds
            backoffMultiplier: 2,
        },

        // Auto-sync settings
        sync: {
            autoSyncOnReconnect: true,
            syncIntervalMs: 5 * 60 * 1000, // Check every 5 minutes
        },
    },
};
