# AI Email Client - Frontend

Modern email client with AI-powered summaries, intelligent caching, and client-side encryption.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy .env.example and paste into .env and modify the values
cp .env.example .env

# 3. Start dev server
npm run dev
```

## 🎯 Key Features

### 1. **AI-Powered Email Summaries**

Automatic email summarization using Groq AI or Google Gemini with 3-tier caching strategy.

#### Flow Diagram

```
User opens email
    ↓
┌─────────────────────────────────────────────┐
│ L1: In-Memory Cache (Backend)              │
│ ⚡ ~1ms lookup                              │
│ TTL: 24 hours                               │
│ Size: 2000 entries (LRU eviction)          │
└─────────────────────────────────────────────┘
    ↓ Cache Miss
┌─────────────────────────────────────────────┐
│ L2: PostgreSQL (Backend)                    │
│ 💾 ~10-50ms lookup                          │
│ TTL: Permanent                              │
│ Encrypted: AES-256-GCM                      │
└─────────────────────────────────────────────┘
    ↓ Cache Miss
┌─────────────────────────────────────────────┐
│ L3: AI Provider (Groq/Gemini)              │
│ 🌐 ~500-2000ms                              │
│ Generates new summary                       │
└─────────────────────────────────────────────┘
    ↓
Save to L2 & L1 cache
```

#### Backend Implementation

**Service**: `AiSummaryService.java`

```java
// 3-tier cache strategy
1. Check in-memory cache (ConcurrentHashMap + TTL)
2. If miss → Check database (email_summaries table)
3. If miss → Call AI API (Groq/Gemini)
4. Save to both caches
```

**Key Features**:

-  Per-key locking (prevent duplicate AI calls)
-  SHA-256 content hashing (cache invalidation)
-  Encrypted summaries in database
-  Configurable via environment variables

**Configuration** (`backend/.env`):

```env
AI_PROVIDER=groq                    # or gemini
AI_CACHE_TTL_SECONDS=86400          # 24 hours
AI_CACHE_MAX_ENTRIES=2000
AI_GROQ_MODEL=llama-3.3-70b-versatile
AI_GROQ_MAX_OUTPUT_TOKENS=120
AI_SUMMARY_PROMPT="..."             # Custom prompt
```

#### Frontend Integration

**Usage**: `EmailDetail.tsx`, `KanbanView.tsx`

```typescript
// Unified content format for cache consistency
const content =
  email.body ||
  email.snippet ||
  "";

const response =
  await aiService.summarizeEmail(
    {
      messageId:
        email.id,
      content,
    }
  );

// Backend returns cached or fresh summary
console.log(
  response.summary
); // "Check pull request deadline tomorrow"
console.log(
  response.cached
); // true/false
console.log(
  response.source
); // "memory" | "database" | "ai"
```

**Cache Efficiency**:

- DetailView and KanbanView use **same content format**
- Summary fetched once, reused everywhere
- ~100% cache hit rate after first load

---

### 2. **IndexedDB Smart Caching**

Client-side persistent cache with intelligent invalidation for instant email loading.

#### Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    User Action                           │
│              (Switch label / Refresh page)               │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│              Check IndexedDB Cache                       │
│              ~20-50ms lookup                             │
└──────────────────────────────────────────────────────────┘
         ↓ Hit                           ↓ Miss
┌─────────────────────┐         ┌─────────────────────────┐
│  Return Cached Data │         │   Fetch from Network    │
│  (Show immediately) │         │   ~500-2000ms           │
│  ✅ Never expires!  │         └─────────────────────────┘
└─────────────────────┘                    ↓
                              ┌─────────────────────────┐
                              │   Save to Cache         │
                              │   Return data           │
                              └─────────────────────────┘

Cache invalidates ONLY on:
  • Manual refresh
  • Delete/move email
  • User logout
```

#### Implementation

**Service**: `indexedDBService.ts`

```typescript
// Storage Structure
{
  emails: {
    key: "emails:user@example.com:INBOX",
    data: [encrypted email objects],
    timestamp: 1705000000000,
    userEmail: "user@example.com",
    labelId: "INBOX"
  },
  labels: {
    key: "labels:user@example.com",
    data: [encrypted label objects],
    timestamp: 1705000000000
  }
}
```

**Features**:

- ✅ Encrypted data storage (AES-GCM)
- ✅ **Smart invalidation** (no time-based expiry)
- ✅ Persists indefinitely until user action
- ✅ Per-user isolation
- ✅ Compound indexes for fast lookups
- ✅ Auto-invalidation on delete/move/refresh

**Redux Integration**: `gmailSlice.ts`

```typescript
// Stale-while-revalidate pattern
export const fetchMessages =
  createAsyncThunk(
    "gmail/fetchMessages",
    async ({
      labelId,
      userEmail,
      forceRefresh = false,
    }) => {
      if (
        !forceRefresh
      ) {
        // 1. Check cache
        const cached =
          await indexedDBService.getEmails(
            userEmail,
            labelId
          );

        if (
          cached &&
          cached
            .data
            .length >
            0
        ) {
          // 2. Return cached data immediately
          console.log(
            ` CACHE HIT (${cached.data.length} emails)`
          );

          // 3. If stale, fetch fresh data in background
          if (
            cached.isStale
          ) {
            gmailService
              .getMessages(
                labelId
              )
              .then(
                (
                  fresh
                ) => {
                  // Update cache + Redux store silently
                  indexedDBService.setEmails(
                    userEmail,
                    labelId,
                    fresh.messages
                  );
                  dispatch(
                    updateMessages(
                      fresh
                    )
                  );
                }
              );
          }

          return {
            messages:
              cached.data,
            nextPageToken:
              null,
          };
        }
      }

      // Cache miss or force refresh
      const response =
        await gmailService.getMessages(
          labelId
        );
      indexedDBService.setEmails(
        userEmail,
        labelId,
        response.messages
      );
      return response;
    }
  );
```

**Performance Metrics**:

| Scenario                   | Load Time             | User Experience             |
| -------------------------- | --------------------- | --------------------------- |
| First visit                | ~2000ms               | Network fetch (unavoidable) |
| Second visit (fresh cache) | ~30ms                 | ⚡ Instant!                 |
| Third visit (stale cache)  | ~30ms + silent update | ⚡ Instant + fresher        |
| Refresh button             | ~500ms                | Force network fetch         |

---

### 3. **Client-Side Encryption**

Protect sensitive email data at rest in IndexedDB.

#### Security Model

**Threat Protection**:

| Threat                       | Without Encryption   | With Encryption           |
| ---------------------------- | -------------------- | ------------------------- |
| DevTools inspection (F12)    | ❌ Plaintext visible |  Encrypted blobs only   |
| Malicious browser extensions | ❌ Can steal emails  |  Useless encrypted data |
| Physical disk access         | ❌ Plaintext on disk |  Encrypted files        |
| Same-origin attacks          |  Protected by SOP  |  Protected by SOP       |
| Memory dumps                 | ❌ Plaintext in RAM  |  Decrypted in memory    |

#### Implementation

**Service**: `encryptionService.ts`

**Algorithm**: AES-256-GCM (Galois/Counter Mode)

**Key Derivation**:

```typescript
User Email: "user@example.com"
    ↓
PBKDF2 (100,000 iterations)
    ↓ SHA-256 hash
    ↓ Salt: "email-client-salt-2026"
    ↓
256-bit AES Key
```

**Encryption Process**:

```typescript
// Before saving to IndexedDB
const plaintext = JSON.stringify(emails);
    ↓ TextEncoder
const bytes = [117, 115, 101, ...]
    ↓ Generate Random IV (12 bytes)
const iv = crypto.getRandomValues(...)
    ↓ AES-GCM Encrypt
const ciphertext = crypto.subtle.encrypt(...)
    ↓ Combine IV + Ciphertext
const combined = [iv, ciphertext]
    ↓ Base64 Encode
const encrypted = "xJ3kL9mP2q5rT8vW1yZ4..."

// Save to IndexedDB
indexedDB.put({ data: encrypted });
```

**Decryption Process**:

```typescript
// Load from IndexedDB
const encrypted = indexedDB.get(key);
    ↓ Base64 Decode
const combined = atob(encrypted);
    ↓ Extract IV + Ciphertext
const iv = combined.slice(0, 12);
const ciphertext = combined.slice(12);
    ↓ AES-GCM Decrypt
const plaintext = crypto.subtle.decrypt(...)
    ↓ TextDecoder
const json = decoder.decode(plaintext);
    ↓ JSON Parse
const emails = JSON.parse(json);
```

**Security Properties**:

-  **Per-user keys** - Each user has unique encryption key
-  **Random IV** - Different ciphertext for same plaintext
-  **Authenticated encryption** - GCM prevents tampering
-  **Key not stored** - Derived on-demand from email
-  **Memory-only key** - Cleared on logout/refresh

**Usage Example**:

```typescript
// Initialize encryption (once per session)
await encryptionService.initialize(
  userEmail
);

// Encrypt before save
const encrypted =
  await encryptionService.encrypt(
    emails
  );
await indexedDBService.setEmails(
  userEmail,
  labelId,
  encrypted
);

// Decrypt after load
const encrypted =
  await indexedDBService.getEmails(
    userEmail,
    labelId
  );
const decrypted =
  await encryptionService.decrypt(
    encrypted
  );
```

**Key Management**:

```typescript
// On login
await encryptionService.initialize(
  user.email
);

// On logout
encryptionService.clear(); // Remove key from memory
```

---

## 📊 Combined Performance

**Cold Start (First Visit)**:

```
1. No IndexedDB cache → Network fetch (~2000ms)
2. No AI cache → Call Groq API (~1500ms)
3. Save both caches
Total: ~3500ms first email
```

**Warm Start (Subsequent Visits)**:

```
1. IndexedDB hit → ~30ms
2. AI backend cache hit → ~50ms
Total: ~80ms per email ⚡
```

**Improvement**: **43x faster** after caching!

---

## 🔧 Configuration

### Cache Settings

**IndexedDB** (Frontend):

```typescript
// src/services/indexedDBService.ts
const CACHE_DURATION =
  5 * 60 * 1000; // 5 minutes
```

**AI Cache** (Backend):

```env
# backend/.env
AI_CACHE_TTL_SECONDS=86400        # 24 hours
AI_CACHE_MAX_ENTRIES=2000
```

### Encryption Settings

**Key Derivation**:

```typescript
// src/services/encryptionService.ts
iterations: 100000,               // PBKDF2 iterations
salt: 'email-client-salt-2026',  // Should be per-user in production
```

---

## 🐛 Debugging

**IndexedDB Cache**:

```typescript
// Browser Console
1. F12 → Application → IndexedDB → EmailClientDB
2. Check 'emails' and 'labels' stores
3. Data should be encrypted (Base64 strings)
```

**Console Logs**:

```typescript
// Cache hits/misses
[IndexedDB]  Messages CACHE HIT for INBOX (35ms) - 50 emails - Stale: false
[IndexedDB] ❌ Messages CACHE MISS for SENT - Fetching from network...
[IndexedDB] 🔄 Fetching fresh messages for INBOX in background...
```

**AI Cache**:

```java
// Backend logs
[CACHE HIT] messageId=abc123
[DB HIT] messageId=abc123
[AI CALL] messageId=xyz789
```
---

## 🤝 Contributing

When modifying cache or encryption logic:

1. Update corresponding tests
2. Run security audit
3. Benchmark performance impact
4. Update this README
