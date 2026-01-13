# Offline Caching Feature

## Overview

This feature implements robust offline support for the email client using **IndexedDB** with **stale-while-revalidate** caching strategy. Users can view cached emails, perform actions offline, and have their changes automatically synced when back online.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI LAYER                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ EmailList   │  │ EmailDetail │  │ OfflineBanner           │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
└─────────┼────────────────┼──────────────────────┼────────────────┘
          │                │                      │
┌─────────┼────────────────┼──────────────────────┼────────────────┐
│         ▼                ▼                      ▼                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              useOffline() Hook                            │   │
│  │  - Network status detection                               │   │
│  │  - Sync queue management                                  │   │
│  │  - Pending actions count                                  │   │
│  └─────────────────────────┬────────────────────────────────┘   │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              offlineService.ts                            │   │
│  │  - Event-based architecture                               │   │
│  │  - Action queue (MARK_READ, DELETE, STAR, etc.)          │   │
│  │  - Retry with exponential backoff                         │   │
│  └─────────────────────────┬────────────────────────────────┘   │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│                        STORAGE LAYER                               │
│  ┌───────────────────────────────────────────────────────────────┐│
│  │                    IndexedDB v2                               ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌───────────────────────────┐││
│  │  │   emails    │ │   labels    │ │    pending_actions        │││
│  │  │  (lists)    │ │  (cached)   │ │    (offline queue)        │││
│  │  └─────────────┘ └─────────────┘ └───────────────────────────┘││
│  │  ┌─────────────────────────────────────────────────────────┐  ││
│  │  │             individual_emails (detail cache)            │  ││
│  │  └─────────────────────────────────────────────────────────┘  ││
│  └───────────────────────────────────────────────────────────────┘│
│  ┌───────────────────────────────────────────────────────────────┐│
│  │              encryptionService.ts                             ││
│  │  - AES-GCM encryption for stored data                        ││
│  │  - PBKDF2 key derivation                                      ││
│  └───────────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────┘
```

## Features

### 1. Stale-While-Revalidate Caching
- **Instant Display**: Cached emails are shown immediately
- **Background Refresh**: Fresh data is fetched in the background
- **Smart TTL**: 5 minutes online, 24 hours offline

### 2. Offline Action Queue
Actions performed offline are queued and executed when back online:
- ✅ Mark as Read/Unread
- ✅ Toggle Star
- ✅ Delete Email
- ✅ Bulk Operations

### 3. Security
- All cached data is encrypted using **AES-256-GCM**
- Keys are derived per-user using **PBKDF2**
- Cache is cleared on logout

### 4. UI Indicators
- **OfflineBanner**: Shows network status and pending actions
- **CacheDebugPanel**: Development tool for cache inspection

## Files

| File | Description |
|------|-------------|
| `services/indexedDBService.ts` | IndexedDB wrapper with encryption |
| `services/offlineService.ts` | Offline queue management |
| `services/encryptionService.ts` | AES-GCM encryption |
| `hooks/useOffline.ts` | React hook for offline status |
| `components/common/OfflineBanner.tsx` | UI indicator |
| `components/common/CacheDebugPanel.tsx` | Debug panel (dev only) |
| `config/appConfig.ts` | Configuration options |

## Configuration

```typescript
// config/appConfig.ts
export const appConfig = {
  offline: {
    cacheDuration: {
      online: 5 * 60 * 1000,      // 5 minutes
      offline: 24 * 60 * 60 * 1000, // 24 hours
    },
    queue: {
      maxRetries: 3,
      initialRetryDelay: 1000,
      maxRetryDelay: 30000,
      backoffMultiplier: 2,
    },
  },
};
```

## Usage

### Check Offline Status
```tsx
import { useOffline } from '../hooks/useOffline';

function MyComponent() {
  const { isOffline, pendingCount, triggerSync } = useOffline();
  
  return (
    <div>
      {isOffline ? 'You are offline' : 'Online'}
      {pendingCount > 0 && `${pendingCount} pending actions`}
    </div>
  );
}
```

### Queue Offline Actions
```tsx
import { offlineService } from '../services/offlineService';

// Queue an action when offline
await offlineService.queueMarkAsRead(messageId);
await offlineService.queueToggleStar(messageId, true);
await offlineService.queueDelete(messageId);
```

## Testing

1. Open DevTools → Application → IndexedDB
2. Look for `EmailClientDB` database
3. Use the Cache Debug Panel (bottom-right icon in dev mode)
4. Simulate offline: DevTools → Network → Offline

## Browser Support

- Chrome 49+
- Firefox 44+
- Safari 10.1+
- Edge 79+

All browsers supporting IndexedDB and Web Crypto API.
