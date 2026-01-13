import { ParsedEmail, GmailLabel } from '../types/gmail';
import { encryptionService } from './encryptionService';

const DB_NAME = 'EmailClientDB';
const DB_VERSION = 1;
const EMAILS_STORE = 'emails';
const LABELS_STORE = 'labels';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache TTL

// Note: We store encrypted blobs in IndexedDB; decryption happens on read

class IndexedDBService {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

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
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

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
            };
        });

        return this.initPromise;
    }

    /**
     * Generate cache key for emails based on user and label
     */
    private getEmailsCacheKey(userEmail: string, labelId: string): string {
        return `emails:${userEmail}:${labelId}`;
    }

    /**
     * Generate cache key for labels
     */
    private getLabelsCacheKey(userEmail: string): string {
        return `labels:${userEmail}`;
    }

    /**
     * Check if cached data is still valid
     */
    private isValidCache(timestamp: number): boolean {
        return Date.now() - timestamp < CACHE_DURATION;
    }

    /**
     * Store emails in IndexedDB
     */
    async setEmails(
        userEmail: string,
        labelId: string,
        emails: ParsedEmail[]
    ): Promise<void> {
        await this.init();
        if (!this.db) return;

        try {
            // Ensure encryption is initialized
            await encryptionService.initialize(userEmail);

            // Encrypt email data
            const encryptedData = await encryptionService.encrypt(emails);

            const key = this.getEmailsCacheKey(userEmail, labelId);
            const entry = {
                key,
                data: encryptedData, // Store encrypted data
                timestamp: Date.now(),
                userEmail,
                labelId,
            };

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([EMAILS_STORE], 'readwrite');
                const store = transaction.objectStore(EMAILS_STORE);
                const request = store.put(entry);

                request.onsuccess = () => resolve();
                request.onerror = () => {
                    console.error('Failed to store emails:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Failed to encrypt and store emails:', error);
            throw error;
        }
    }

    /**
     * Retrieve emails from IndexedDB
     */
    async getEmails(
        userEmail: string,
        labelId: string
    ): Promise<{ data: ParsedEmail[]; isStale: boolean } | null> {
        await this.init();
        if (!this.db) return null;

        const key = this.getEmailsCacheKey(userEmail, labelId);

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([EMAILS_STORE], 'readonly');
            const store = transaction.objectStore(EMAILS_STORE);
            const request = store.get(key);

            request.onsuccess = async () => {
                const entry = request.result as { key: string; data: string; timestamp: number; userEmail: string; labelId: string } | undefined;
                if (!entry) {
                    resolve(null);
                    return;
                }

                try {
                    // Ensure encryption is initialized
                    await encryptionService.initialize(userEmail);

                    // Decrypt email data
                    const decryptedData = await encryptionService.decrypt<ParsedEmail[]>(entry.data);

                    const isStale = !this.isValidCache(entry.timestamp);
                    resolve({
                        data: decryptedData,
                        isStale,
                    });
                } catch (error) {
                    console.error('Failed to decrypt emails:', error);
                    resolve(null);
                }
            };

            request.onerror = () => {
                console.error('Failed to retrieve emails:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Store labels in IndexedDB
     */
    async setLabels(userEmail: string, labels: GmailLabel[]): Promise<void> {
        await this.init();
        if (!this.db) return;

        try {
            // Ensure encryption is initialized
            await encryptionService.initialize(userEmail);

            // Encrypt label data
            const encryptedData = await encryptionService.encrypt(labels);

            const key = this.getLabelsCacheKey(userEmail);
            const entry = {
                key,
                data: encryptedData, // Store encrypted data
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
            throw error;
        }
    }

    /**
     * Retrieve labels from IndexedDB
     */
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
                const entry = request.result as { key: string; data: string; timestamp: number } | undefined;
                if (!entry) {
                    resolve(null);
                    return;
                }

                try {
                    // Ensure encryption is initialized
                    await encryptionService.initialize(userEmail);

                    // Decrypt label data
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

    /**
     * Clear all cached emails for a user
     */
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
                    resolve();
                }
            };

            request.onerror = () => {
                console.error('Failed to clear emails cache:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Invalidate cache for a specific label
     * This should be called when emails are moved to/from a label
     */
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

    /**
     * Clear expired cache entries
     */
    async clearExpiredCache(): Promise<void> {
        await this.init();
        if (!this.db) return;

        const expiryTime = Date.now() - CACHE_DURATION;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([EMAILS_STORE, LABELS_STORE], 'readwrite');

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

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => {
                console.error('Failed to clear expired cache:', transaction.error);
                reject(transaction.error);
            };
        });
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

// Auto-cleanup expired cache on load
indexedDBService.clearExpiredCache().catch(console.error);
