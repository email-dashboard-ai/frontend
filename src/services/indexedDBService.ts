import { ParsedEmail, GmailLabel } from '../types/gmail';
import { encryptionService } from './encryptionService';

const DB_NAME = 'EmailClientDB';
const DB_VERSION = 2; // Upgraded version for new stores
const EMAILS_STORE = 'emails';
const LABELS_STORE = 'labels';
const INDIVIDUAL_EMAILS_STORE = 'individual_emails';
const PENDING_ACTIONS_STORE = 'pending_actions';
const SYNC_METADATA_STORE = 'sync_metadata';

// Dynamic cache duration based on network status
const CACHE_DURATION_ONLINE = 5 * 60 * 1000; // 5 minutes when online
const CACHE_DURATION_OFFLINE = 24 * 60 * 60 * 1000; // 24 hours when offline

// Types for pending actions (offline queue)
export type PendingActionType =
    | 'MARK_READ'
    | 'MARK_UNREAD'
    | 'TOGGLE_STAR'
    | 'DELETE'
    | 'SEND'
    | 'REPLY'
    | 'MOVE_TO_INBOX'
    | 'SNOOZE';

export interface PendingAction {
    id: string;
    type: PendingActionType;
    payload: Record<string, unknown>;
    createdAt: number;
    retryCount: number;
    maxRetries: number;
    status: 'pending' | 'processing' | 'failed';
    error?: string;
}

export interface SyncMetadata {
    key: string;
    lastSyncTime: number;
    syncStatus: 'synced' | 'pending' | 'error';
}

class IndexedDBService {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;
    private isOffline: boolean = !navigator.onLine;

    constructor() {
        // Listen for online/offline events
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.isOffline = false;
                console.log('[IndexedDB] 🌐 Network: Online');
            });
            window.addEventListener('offline', () => {
                this.isOffline = true;
                console.log('[IndexedDB] 📴 Network: Offline');
            });
        }
    }

    /**
     * Get current cache duration based on network status
     */
    private getCacheDuration(): number {
        return this.isOffline ? CACHE_DURATION_OFFLINE : CACHE_DURATION_ONLINE;
    }

    /**
     * Check if currently offline
     */
    getOfflineStatus(): boolean {
        return this.isOffline;
    }

    async init(): Promise<void> {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise((resolve, reject) => {
            if (this.db) {
                resolve();
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB failed to open:', request.error);
                this.initPromise = null; // Reset so we can retry
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;

                // Handle connection errors
                this.db.onerror = (event) => {
                    console.error('IndexedDB error:', event);
                };

                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                const oldVersion = event.oldVersion;

                // Create emails store with compound index
                if (!db.objectStoreNames.contains(EMAILS_STORE)) {
                    const emailStore = db.createObjectStore(EMAILS_STORE, { keyPath: 'key' });
                    emailStore.createIndex('timestamp', 'timestamp', { unique: false });
                    emailStore.createIndex('userEmail_labelId', ['userEmail', 'labelId'], { unique: false });
                }

                // Create labels store
                if (!db.objectStoreNames.contains(LABELS_STORE)) {
                    const labelStore = db.createObjectStore(LABELS_STORE, { keyPath: 'key' });
                    labelStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // NEW: Create individual emails store for email detail caching
                if (!db.objectStoreNames.contains(INDIVIDUAL_EMAILS_STORE)) {
                    const individualEmailStore = db.createObjectStore(INDIVIDUAL_EMAILS_STORE, { keyPath: 'key' });
                    individualEmailStore.createIndex('timestamp', 'timestamp', { unique: false });
                    individualEmailStore.createIndex('userEmail', 'userEmail', { unique: false });
                    individualEmailStore.createIndex('emailId', 'emailId', { unique: false });
                }

                // NEW: Create pending actions store for offline queue
                if (!db.objectStoreNames.contains(PENDING_ACTIONS_STORE)) {
                    const pendingStore = db.createObjectStore(PENDING_ACTIONS_STORE, { keyPath: 'id' });
                    pendingStore.createIndex('status', 'status', { unique: false });
                    pendingStore.createIndex('createdAt', 'createdAt', { unique: false });
                    pendingStore.createIndex('type', 'type', { unique: false });
                }

                // NEW: Create sync metadata store
                if (!db.objectStoreNames.contains(SYNC_METADATA_STORE)) {
                    const syncStore = db.createObjectStore(SYNC_METADATA_STORE, { keyPath: 'key' });
                    syncStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                console.log(`[IndexedDB] 🔄 Database upgraded from v${oldVersion} to v${DB_VERSION}`);
            };
        });

        return this.initPromise;
    }

    // ===============================
    // CACHE KEY GENERATORS
    // ===============================

    private getEmailsCacheKey(userEmail: string, labelId: string): string {
        return `emails:${userEmail}:${labelId}`;
    }

    private getLabelsCacheKey(userEmail: string): string {
        return `labels:${userEmail}`;
    }

    private getIndividualEmailKey(userEmail: string, emailId: string): string {
        return `email:${userEmail}:${emailId}`;
    }

    // ===============================
    // CACHE VALIDATION
    // ===============================

    private isValidCache(timestamp: number): boolean {
        return Date.now() - timestamp < this.getCacheDuration();
    }

    // ===============================
    // EMAIL LIST OPERATIONS (Stale-While-Revalidate)
    // ===============================

    async setEmails(
        userEmail: string,
        labelId: string,
        emails: ParsedEmail[]
    ): Promise<void> {
        await this.init();
        if (!this.db) return;

        try {
            await encryptionService.initialize(userEmail);
            const encryptedData = await encryptionService.encrypt(emails);

            const key = this.getEmailsCacheKey(userEmail, labelId);
            const entry = {
                key,
                data: encryptedData,
                timestamp: Date.now(),
                userEmail,
                labelId,
                count: emails.length,
            };

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([EMAILS_STORE], 'readwrite');
                const store = transaction.objectStore(EMAILS_STORE);
                const request = store.put(entry);

                request.onsuccess = () => {
                    console.log(`[IndexedDB] 💾 Cached ${emails.length} emails for ${labelId}`);
                    resolve();
                };
                request.onerror = () => {
                    console.error('Failed to store emails:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Failed to encrypt and store emails:', error);
            // Don't throw - caching failure shouldn't break the app
        }
    }

    async getEmails(
        userEmail: string,
        labelId: string
    ): Promise<{ data: ParsedEmail[]; isStale: boolean; timestamp: number } | null> {
        await this.init();
        if (!this.db) return null;

        const key = this.getEmailsCacheKey(userEmail, labelId);

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([EMAILS_STORE], 'readonly');
            const store = transaction.objectStore(EMAILS_STORE);
            const request = store.get(key);

            request.onsuccess = async () => {
                const entry = request.result as {
                    key: string;
                    data: string;
                    timestamp: number;
                    userEmail: string;
                    labelId: string;
                    count: number;
                } | undefined;

                if (!entry) {
                    resolve(null);
                    return;
                }

                try {
                    await encryptionService.initialize(userEmail);
                    const decryptedData = await encryptionService.decrypt<ParsedEmail[]>(entry.data);
                    const isStale = !this.isValidCache(entry.timestamp);

                    resolve({
                        data: decryptedData,
                        isStale,
                        timestamp: entry.timestamp,
                    });
                } catch (error) {
                    console.error('Failed to decrypt emails:', error);
                    // Remove corrupted cache entry
                    this.invalidateLabelCache(userEmail, labelId).catch(console.error);
                    resolve(null);
                }
            };

            request.onerror = () => {
                console.error('Failed to retrieve emails:', request.error);
                reject(request.error);
            };
        });
    }

    // ===============================
    // INDIVIDUAL EMAIL OPERATIONS
    // ===============================

    async setIndividualEmail(
        userEmail: string,
        email: ParsedEmail
    ): Promise<void> {
        await this.init();
        if (!this.db) return;

        try {
            await encryptionService.initialize(userEmail);
            const encryptedData = await encryptionService.encrypt(email);

            const key = this.getIndividualEmailKey(userEmail, email.id);
            const entry = {
                key,
                emailId: email.id,
                data: encryptedData,
                timestamp: Date.now(),
                userEmail,
            };

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([INDIVIDUAL_EMAILS_STORE], 'readwrite');
                const store = transaction.objectStore(INDIVIDUAL_EMAILS_STORE);
                const request = store.put(entry);

                request.onsuccess = () => resolve();
                request.onerror = () => {
                    console.error('Failed to store individual email:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Failed to encrypt and store individual email:', error);
        }
    }

    async getIndividualEmail(
        userEmail: string,
        emailId: string
    ): Promise<{ data: ParsedEmail; isStale: boolean } | null> {
        await this.init();
        if (!this.db) return null;

        const key = this.getIndividualEmailKey(userEmail, emailId);

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([INDIVIDUAL_EMAILS_STORE], 'readonly');
            const store = transaction.objectStore(INDIVIDUAL_EMAILS_STORE);
            const request = store.get(key);

            request.onsuccess = async () => {
                const entry = request.result as {
                    key: string;
                    emailId: string;
                    data: string;
                    timestamp: number;
                    userEmail: string;
                } | undefined;

                if (!entry) {
                    resolve(null);
                    return;
                }

                try {
                    await encryptionService.initialize(userEmail);
                    const decryptedData = await encryptionService.decrypt<ParsedEmail>(entry.data);
                    const isStale = !this.isValidCache(entry.timestamp);

                    resolve({
                        data: decryptedData,
                        isStale,
                    });
                } catch (error) {
                    console.error('Failed to decrypt individual email:', error);
                    resolve(null);
                }
            };

            request.onerror = () => {
                console.error('Failed to retrieve individual email:', request.error);
                reject(request.error);
            };
        });
    }

    // ===============================
    // LABELS OPERATIONS
    // ===============================

    async setLabels(userEmail: string, labels: GmailLabel[]): Promise<void> {
        await this.init();
        if (!this.db) return;

        try {
            await encryptionService.initialize(userEmail);
            const encryptedData = await encryptionService.encrypt(labels);

            const key = this.getLabelsCacheKey(userEmail);
            const entry = {
                key,
                data: encryptedData,
                timestamp: Date.now(),
            };

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([LABELS_STORE], 'readwrite');
                const store = transaction.objectStore(LABELS_STORE);
                const request = store.put(entry);

                request.onsuccess = () => resolve();
                request.onerror = () => {
                    console.error('Failed to store labels:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Failed to encrypt and store labels:', error);
        }
    }

    async getLabels(
        userEmail: string
    ): Promise<{ data: GmailLabel[]; isStale: boolean } | null> {
        await this.init();
        if (!this.db) return null;

        const key = this.getLabelsCacheKey(userEmail);

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([LABELS_STORE], 'readonly');
            const store = transaction.objectStore(LABELS_STORE);
            const request = store.get(key);

            request.onsuccess = async () => {
                const entry = request.result as {
                    key: string;
                    data: string;
                    timestamp: number;
                } | undefined;

                if (!entry) {
                    resolve(null);
                    return;
                }

                try {
                    await encryptionService.initialize(userEmail);
                    const decryptedData = await encryptionService.decrypt<GmailLabel[]>(entry.data);
                    const isStale = !this.isValidCache(entry.timestamp);

                    resolve({
                        data: decryptedData,
                        isStale,
                    });
                } catch (error) {
                    console.error('Failed to decrypt labels:', error);
                    resolve(null);
                }
            };

            request.onerror = () => {
                console.error('Failed to retrieve labels:', request.error);
                reject(request.error);
            };
        });
    }

    // ===============================
    // PENDING ACTIONS (OFFLINE QUEUE)
    // ===============================

    /**
     * Generate unique ID for pending action
     */
    private generateActionId(): string {
        return `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Add action to offline queue
     */
    async addPendingAction(
        type: PendingActionType,
        payload: Record<string, unknown>,
        maxRetries: number = 3
    ): Promise<PendingAction> {
        await this.init();
        if (!this.db) throw new Error('IndexedDB not initialized');

        const action: PendingAction = {
            id: this.generateActionId(),
            type,
            payload,
            createdAt: Date.now(),
            retryCount: 0,
            maxRetries,
            status: 'pending',
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([PENDING_ACTIONS_STORE], 'readwrite');
            const store = transaction.objectStore(PENDING_ACTIONS_STORE);
            const request = store.add(action);

            request.onsuccess = () => {
                console.log(`[IndexedDB] 📤 Queued offline action: ${type}`, payload);
                resolve(action);
            };
            request.onerror = () => {
                console.error('Failed to add pending action:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get all pending actions
     */
    async getPendingActions(): Promise<PendingAction[]> {
        await this.init();
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([PENDING_ACTIONS_STORE], 'readonly');
            const store = transaction.objectStore(PENDING_ACTIONS_STORE);
            const index = store.index('status');
            const request = index.getAll(IDBKeyRange.only('pending'));

            request.onsuccess = () => {
                const actions = request.result as PendingAction[];
                // Sort by createdAt (oldest first - FIFO)
                actions.sort((a, b) => a.createdAt - b.createdAt);
                resolve(actions);
            };
            request.onerror = () => {
                console.error('Failed to get pending actions:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get count of pending actions
     */
    async getPendingActionsCount(): Promise<number> {
        await this.init();
        if (!this.db) return 0;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([PENDING_ACTIONS_STORE], 'readonly');
            const store = transaction.objectStore(PENDING_ACTIONS_STORE);
            const index = store.index('status');
            const request = index.count(IDBKeyRange.only('pending'));

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                console.error('Failed to count pending actions:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Update pending action status
     */
    async updatePendingAction(
        actionId: string,
        updates: Partial<Pick<PendingAction, 'status' | 'retryCount' | 'error'>>
    ): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([PENDING_ACTIONS_STORE], 'readwrite');
            const store = transaction.objectStore(PENDING_ACTIONS_STORE);
            const getRequest = store.get(actionId);

            getRequest.onsuccess = () => {
                const action = getRequest.result as PendingAction | undefined;
                if (!action) {
                    resolve();
                    return;
                }

                const updatedAction = { ...action, ...updates };
                const putRequest = store.put(updatedAction);

                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => {
                    console.error('Failed to update pending action:', putRequest.error);
                    reject(putRequest.error);
                };
            };

            getRequest.onerror = () => {
                console.error('Failed to get pending action for update:', getRequest.error);
                reject(getRequest.error);
            };
        });
    }

    /**
     * Remove completed action from queue
     */
    async removePendingAction(actionId: string): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([PENDING_ACTIONS_STORE], 'readwrite');
            const store = transaction.objectStore(PENDING_ACTIONS_STORE);
            const request = store.delete(actionId);

            request.onsuccess = () => {
                console.log(`[IndexedDB] ✅ Removed completed action: ${actionId}`);
                resolve();
            };
            request.onerror = () => {
                console.error('Failed to remove pending action:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Clear all failed actions
     */
    async clearFailedActions(): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([PENDING_ACTIONS_STORE], 'readwrite');
            const store = transaction.objectStore(PENDING_ACTIONS_STORE);
            const index = store.index('status');
            const request = index.openCursor(IDBKeyRange.only('failed'));

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = () => {
                console.error('Failed to clear failed actions:', request.error);
                reject(request.error);
            };
        });
    }

    // ===============================
    // CACHE INVALIDATION
    // ===============================

    async clearEmailsCache(userEmail: string): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([EMAILS_STORE], 'readwrite');
            const store = transaction.objectStore(EMAILS_STORE);
            const index = store.index('userEmail_labelId');
            const request = index.openCursor(IDBKeyRange.bound([userEmail], [userEmail, '\uffff']));

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    console.log(`[IndexedDB] 🗑️ Cleared all emails cache for user`);
                    resolve();
                }
            };

            request.onerror = () => {
                console.error('Failed to clear emails cache:', request.error);
                reject(request.error);
            };
        });
    }

    async invalidateLabelCache(userEmail: string, labelId: string): Promise<void> {
        await this.init();
        if (!this.db) return;

        const key = this.getEmailsCacheKey(userEmail, labelId);

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([EMAILS_STORE], 'readwrite');
            const store = transaction.objectStore(EMAILS_STORE);
            const request = store.delete(key);

            request.onsuccess = () => {
                console.log(`[IndexedDB] 🗑️ Cache invalidated for label: ${labelId}`);
                resolve();
            };
            request.onerror = () => {
                console.error('Failed to invalidate label cache:', request.error);
                reject(request.error);
            };
        });
    }

    async clearExpiredCache(): Promise<void> {
        await this.init();
        if (!this.db) return;

        const expiryTime = Date.now() - this.getCacheDuration();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(
                [EMAILS_STORE, LABELS_STORE, INDIVIDUAL_EMAILS_STORE],
                'readwrite'
            );

            // Clear expired emails
            const emailStore = transaction.objectStore(EMAILS_STORE);
            const emailIndex = emailStore.index('timestamp');
            const emailRequest = emailIndex.openCursor(IDBKeyRange.upperBound(expiryTime));

            emailRequest.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            // Clear expired labels
            const labelStore = transaction.objectStore(LABELS_STORE);
            const labelIndex = labelStore.index('timestamp');
            const labelRequest = labelIndex.openCursor(IDBKeyRange.upperBound(expiryTime));

            labelRequest.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            // Clear expired individual emails
            const individualStore = transaction.objectStore(INDIVIDUAL_EMAILS_STORE);
            const individualIndex = individualStore.index('timestamp');
            const individualRequest = individualIndex.openCursor(IDBKeyRange.upperBound(expiryTime));

            individualRequest.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            transaction.oncomplete = () => {
                console.log('[IndexedDB] 🧹 Expired cache cleared');
                resolve();
            };
            transaction.onerror = () => {
                console.error('Failed to clear expired cache:', transaction.error);
                reject(transaction.error);
            };
        });
    }

    /**
     * Clear all user data (on logout)
     */
    async clearAllUserData(userEmail: string): Promise<void> {
        await this.init();
        if (!this.db) return;

        try {
            await this.clearEmailsCache(userEmail);

            // Clear individual emails
            const key = this.getLabelsCacheKey(userEmail);
            const transaction = this.db.transaction(
                [LABELS_STORE, INDIVIDUAL_EMAILS_STORE, PENDING_ACTIONS_STORE],
                'readwrite'
            );

            // Delete labels
            transaction.objectStore(LABELS_STORE).delete(key);

            // Clear individual emails for user
            const individualStore = transaction.objectStore(INDIVIDUAL_EMAILS_STORE);
            const individualIndex = individualStore.index('userEmail');
            const individualRequest = individualIndex.openCursor(IDBKeyRange.only(userEmail));

            individualRequest.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            // Clear all pending actions (they're user-specific implicitly)
            transaction.objectStore(PENDING_ACTIONS_STORE).clear();

            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    console.log('[IndexedDB] 🗑️ All user data cleared');
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error('Failed to clear all user data:', error);
        }
    }

    /**
     * Update read status of an email in all caches (list and individual)
     */
    async updateEmailReadStatus(userEmail: string, messageId: string, isRead: boolean): Promise<void> {
        await this.init();
        if (!this.db) return;

        try {
            await encryptionService.initialize(userEmail);
            const transaction = this.db.transaction([EMAILS_STORE, INDIVIDUAL_EMAILS_STORE], 'readwrite');

            // 1. Update in Email Lists
            const emailStore = transaction.objectStore(EMAILS_STORE);
            // Scan all lists related to this user
            const emailIndex = emailStore.index('userEmail_labelId');
            const cursorRequest = emailIndex.openCursor(IDBKeyRange.bound([userEmail], [userEmail, '\uffff']));

            cursorRequest.onsuccess = async (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    const entry = cursor.value;
                    try {
                        const emails = await encryptionService.decrypt<ParsedEmail[]>(entry.data);
                        let modified = false;

                        const updatedEmails = emails.map(email => {
                            if (email.id === messageId) {
                                modified = true;
                                return { ...email, isRead };
                            }
                            return email;
                        });

                        if (modified) {
                            const encryptedData = await encryptionService.encrypt(updatedEmails);
                            cursor.update({ ...entry, data: encryptedData });
                        }
                    } catch (e) {
                        console.error('Failed to update email list cache:', e);
                    }
                    cursor.continue();
                }
            };

            // 2. Update Individual Email Cache
            const individualStore = transaction.objectStore(INDIVIDUAL_EMAILS_STORE);
            const key = this.getIndividualEmailKey(userEmail, messageId);
            const individualRequest = individualStore.get(key);

            individualRequest.onsuccess = async () => {
                const entry = individualRequest.result;
                if (entry) {
                    try {
                        const email = await encryptionService.decrypt<ParsedEmail>(entry.data);
                        const updatedEmail = { ...email, isRead };
                        const encryptedData = await encryptionService.encrypt(updatedEmail);
                        individualStore.put({ ...entry, data: encryptedData });
                    } catch (e) {
                        console.error('Failed to update individual email cache:', e);
                    }
                }
            };

            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    console.log(`[IndexedDB] ✅ Updated read status for ${messageId}`);
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            });

        } catch (error) {
            console.error('Failed to update read stats in cache:', error);
        }
    }

    /**
     * Update star status of an email in all caches
     */
    async updateEmailStarStatus(userEmail: string, messageId: string, isStarred: boolean): Promise<void> {
        await this.init();
        if (!this.db) return;

        try {
            await encryptionService.initialize(userEmail);
            const transaction = this.db.transaction([EMAILS_STORE, INDIVIDUAL_EMAILS_STORE], 'readwrite');

            // 1. Update in Email Lists
            const emailStore = transaction.objectStore(EMAILS_STORE);
            const emailIndex = emailStore.index('userEmail_labelId');
            const cursorRequest = emailIndex.openCursor(IDBKeyRange.bound([userEmail], [userEmail, '\uffff']));

            cursorRequest.onsuccess = async (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    const entry = cursor.value;
                    try {
                        const emails = await encryptionService.decrypt<ParsedEmail[]>(entry.data);
                        let modified = false;

                        const updatedEmails = emails.map(email => {
                            if (email.id === messageId) {
                                modified = true;
                                return { ...email, isStarred };
                            }
                            return email;
                        });

                        if (modified) {
                            const encryptedData = await encryptionService.encrypt(updatedEmails);
                            cursor.update({ ...entry, data: encryptedData });
                        }
                    } catch (e) {
                        console.error('Failed to update email list cache:', e);
                    }
                    cursor.continue();
                }
            };

            // 2. Update Individual Email Cache
            const individualStore = transaction.objectStore(INDIVIDUAL_EMAILS_STORE);
            const key = this.getIndividualEmailKey(userEmail, messageId);
            const individualRequest = individualStore.get(key);

            individualRequest.onsuccess = async () => {
                const entry = individualRequest.result;
                if (entry) {
                    try {
                        const email = await encryptionService.decrypt<ParsedEmail>(entry.data);
                        const updatedEmail = { ...email, isStarred };
                        const encryptedData = await encryptionService.encrypt(updatedEmail);
                        individualStore.put({ ...entry, data: encryptedData });
                    } catch (e) {
                        console.error('Failed to update individual email cache:', e);
                    }
                }
            };

            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    console.log(`[IndexedDB] ✅ Updated star status for ${messageId}`);
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            });

        } catch (error) {
            console.error('Failed to update star stats in cache:', error);
        }
    }

    /**
     * Get cache statistics for debugging
     */
    async getCacheStats(): Promise<{
        emailListCount: number;
        individualEmailCount: number;
        labelCount: number;
        pendingActionsCount: number;
        totalSize: string;
    }> {
        await this.init();
        if (!this.db) {
            return {
                emailListCount: 0,
                individualEmailCount: 0,
                labelCount: 0,
                pendingActionsCount: 0,
                totalSize: '0 KB',
            };
        }

        const getCount = (storeName: string): Promise<number> => {
            return new Promise((resolve) => {
                try {
                    const transaction = this.db!.transaction([storeName], 'readonly');
                    const store = transaction.objectStore(storeName);
                    const request = store.count();
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => resolve(0);
                } catch {
                    resolve(0);
                }
            });
        };

        const [emailListCount, individualEmailCount, labelCount, pendingActionsCount] =
            await Promise.all([
                getCount(EMAILS_STORE),
                getCount(INDIVIDUAL_EMAILS_STORE),
                getCount(LABELS_STORE),
                getCount(PENDING_ACTIONS_STORE),
            ]);

        // Estimate storage usage
        let totalSize = '0 KB';
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                if (estimate.usage) {
                    const kb = Math.round(estimate.usage / 1024);
                    totalSize = kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb} KB`;
                }
            } catch {
                // Storage estimate not available
            }
        }

        return {
            emailListCount,
            individualEmailCount,
            labelCount,
            pendingActionsCount,
            totalSize,
        };
    }

    /**
     * Close IndexedDB connection
     */
    close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initPromise = null;
        }
    }
}

export const indexedDBService = new IndexedDBService();

// Auto-cleanup expired cache on load (delayed to not block startup)
if (typeof window !== 'undefined') {
    setTimeout(() => {
        indexedDBService.clearExpiredCache().catch(console.error);
    }, 5000);
}
