/**
 * Offline Service
 * Manages offline queue processing and background sync
 * Implements retry logic with exponential backoff
 */

import { indexedDBService, PendingAction, PendingActionType } from './indexedDBService';
import { gmailService } from './gmailService';

// Retry configuration
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const BACKOFF_MULTIPLIER = 2;

// Sync status
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

// Event types for offline status changes
export type OfflineEventType = 'statusChange' | 'pendingCountChange' | 'syncComplete' | 'syncError';

interface OfflineEventData {
  statusChange: { isOffline: boolean };
  pendingCountChange: { count: number };
  syncComplete: { processedCount: number };
  syncError: { error: string; action: PendingAction };
}

type OfflineEventCallback<T extends OfflineEventType> = (data: OfflineEventData[T]) => void;

class OfflineService {
  private isOffline: boolean = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  private syncStatus: SyncStatus = 'idle';
  private isSyncing: boolean = false;
  private pendingCount: number = 0;
  private eventListeners: Map<OfflineEventType, Set<OfflineEventCallback<OfflineEventType>>> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupNetworkListeners();
      this.initPendingCount();
    }
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('[OfflineService] 🌐 Network restored');
      this.isOffline = false;
      this.emit('statusChange', { isOffline: false });
      // Auto-sync when back online
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('[OfflineService] 📴 Network lost');
      this.isOffline = true;
      this.syncStatus = 'offline';
      this.emit('statusChange', { isOffline: true });
    });
  }

  /**
   * Initialize pending count
   */
  private async initPendingCount(): Promise<void> {
    try {
      this.pendingCount = await indexedDBService.getPendingActionsCount();
      this.emit('pendingCountChange', { count: this.pendingCount });
    } catch (error) {
      console.error('[OfflineService] Failed to init pending count:', error);
    }
  }

  /**
   * Event emitter
   */
  private emit<T extends OfflineEventType>(event: T, data: OfflineEventData[T]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          (callback as OfflineEventCallback<T>)(data);
        } catch (error) {
          console.error(`[OfflineService] Event listener error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to events
   */
  on<T extends OfflineEventType>(event: T, callback: OfflineEventCallback<T>): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback as OfflineEventCallback<OfflineEventType>);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(callback as OfflineEventCallback<OfflineEventType>);
    };
  }

  /**
   * Get current offline status
   */
  getOfflineStatus(): boolean {
    return this.isOffline;
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  /**
   * Get pending actions count
   */
  getPendingCount(): number {
    return this.pendingCount;
  }

  /**
   * Queue an action for offline execution
   */
  async queueAction(
    type: PendingActionType,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    try {
      await indexedDBService.addPendingAction(type, payload);
      this.pendingCount++;
      this.emit('pendingCountChange', { count: this.pendingCount });

      // If online, try to process immediately
      if (!this.isOffline && !this.isSyncing) {
        this.processQueue();
      }

      return true;
    } catch (error) {
      console.error('[OfflineService] Failed to queue action:', error);
      return false;
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: PendingAction): Promise<void> {
    const { type, payload } = action;

    switch (type) {
      case 'MARK_READ':
        await gmailService.markAsRead(payload.messageId as string);
        break;

      case 'MARK_UNREAD':
        await gmailService.markAsUnread(payload.messageId as string);
        break;

      case 'TOGGLE_STAR':
        await gmailService.toggleStar(
          payload.messageId as string,
          payload.starred as boolean
        );
        break;

      case 'DELETE':
        await gmailService.deleteEmail(payload.messageId as string);
        break;

      case 'MOVE_TO_INBOX':
        await gmailService.moveToInbox(payload.messageId as string);
        break;

      case 'SNOOZE':
        await gmailService.snoozeEmail(
          payload.messageId as string,
          payload.snoozedUntil as string
        );
        break;

      case 'SEND':
        await gmailService.sendEmail({
          to: payload.to as string[],
          cc: payload.cc as string[] | undefined,
          bcc: payload.bcc as string[] | undefined,
          subject: payload.subject as string,
          body: payload.body as string,
          // Note: attachments can't be queued offline (File objects)
        });
        break;

      case 'REPLY':
        await gmailService.replyEmail({
          messageId: payload.messageId as string,
          to: payload.to as string[] | undefined,
          cc: payload.cc as string[] | undefined,
          bcc: payload.bcc as string[] | undefined,
          body: payload.body as string,
        });
        break;

      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  /**
   * Process the offline queue with retry logic
   */
  async processQueue(): Promise<void> {
    if (this.isOffline) {
      console.log('[OfflineService] Cannot process queue while offline');
      return;
    }

    if (this.isSyncing) {
      console.log('[OfflineService] Sync already in progress');
      return;
    }

    this.isSyncing = true;
    this.syncStatus = 'syncing';

    let processedCount = 0;

    try {
      const actions = await indexedDBService.getPendingActions();

      if (actions.length === 0) {
        console.log('[OfflineService] No pending actions to process');
        this.syncStatus = 'idle';
        return;
      }

      console.log(`[OfflineService] 🔄 Processing ${actions.length} pending actions...`);

      for (const action of actions) {
        // Check if we're still online
        if (this.isOffline) {
          console.log('[OfflineService] Went offline, pausing sync');
          break;
        }

        try {
          await indexedDBService.updatePendingAction(action.id, { status: 'processing' });
          await this.executeAction(action);
          await indexedDBService.removePendingAction(action.id);
          processedCount++;
          this.pendingCount--;
          this.emit('pendingCountChange', { count: this.pendingCount });
          console.log(`[OfflineService] ✅ Processed: ${action.type}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[OfflineService] ❌ Failed to process ${action.type}:`, errorMessage);

          const newRetryCount = action.retryCount + 1;

          if (newRetryCount >= action.maxRetries) {
            // Max retries reached, mark as failed
            await indexedDBService.updatePendingAction(action.id, {
              status: 'failed',
              retryCount: newRetryCount,
              error: errorMessage,
            });
            this.emit('syncError', { error: errorMessage, action });
          } else {
            // Schedule retry with exponential backoff
            await indexedDBService.updatePendingAction(action.id, {
              status: 'pending',
              retryCount: newRetryCount,
              error: errorMessage,
            });

            const delay = Math.min(
              INITIAL_RETRY_DELAY * Math.pow(BACKOFF_MULTIPLIER, newRetryCount),
              MAX_RETRY_DELAY
            );

            console.log(`[OfflineService] ⏳ Retry ${newRetryCount}/${action.maxRetries} in ${delay}ms`);
            setTimeout(() => this.processQueue(), delay);
          }
        }
      }

      this.syncStatus = processedCount > 0 ? 'idle' : 'error';
      this.emit('syncComplete', { processedCount });
      console.log(`[OfflineService] 🎉 Sync complete. Processed: ${processedCount}`);
    } catch (error) {
      console.error('[OfflineService] Queue processing error:', error);
      this.syncStatus = 'error';
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Retry all failed actions
   */
  async retryFailedActions(): Promise<void> {
    try {
      const actions = await indexedDBService.getPendingActions();
      for (const action of actions) {
        if (action.status === 'failed') {
          await indexedDBService.updatePendingAction(action.id, {
            status: 'pending',
            retryCount: 0,
            error: undefined,
          });
        }
      }

      // Refresh pending count
      this.pendingCount = await indexedDBService.getPendingActionsCount();
      this.emit('pendingCountChange', { count: this.pendingCount });

      // Try to process
      if (!this.isOffline) {
        this.processQueue();
      }
    } catch (error) {
      console.error('[OfflineService] Failed to retry failed actions:', error);
    }
  }

  /**
   * Clear all failed actions
   */
  async clearFailedActions(): Promise<void> {
    try {
      await indexedDBService.clearFailedActions();
      this.pendingCount = await indexedDBService.getPendingActionsCount();
      this.emit('pendingCountChange', { count: this.pendingCount });
    } catch (error) {
      console.error('[OfflineService] Failed to clear failed actions:', error);
    }
  }

  /**
   * Helper: Queue mark as read action
   */
  async queueMarkAsRead(messageId: string): Promise<boolean> {
    return this.queueAction('MARK_READ', { messageId });
  }

  /**
   * Helper: Queue mark as unread action
   */
  async queueMarkAsUnread(messageId: string): Promise<boolean> {
    return this.queueAction('MARK_UNREAD', { messageId });
  }

  /**
   * Helper: Queue toggle star action
   */
  async queueToggleStar(messageId: string, starred: boolean): Promise<boolean> {
    return this.queueAction('TOGGLE_STAR', { messageId, starred });
  }

  /**
   * Helper: Queue delete action
   */
  async queueDelete(messageId: string): Promise<boolean> {
    return this.queueAction('DELETE', { messageId });
  }

  /**
   * Helper: Queue send email action
   */
  async queueSendEmail(params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
  }): Promise<boolean> {
    return this.queueAction('SEND', params);
  }
}

export const offlineService = new OfflineService();
