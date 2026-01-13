import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  markEmailAsRead,
  markEmailAsUnread,
  toggleEmailStar,
  deleteEmailAction,
  untrashEmailAction,
  fetchMessages,
  batchDeleteEmailsAction,
  batchUpdateStatusAction,
  setSelectedMessage
} from '../store/slices/gmailSlice';
import { gmailService } from '../services/gmailService';
import { indexedDBService } from '../services/indexedDBService';
import { offlineService } from '../services/offlineService';
import { useIsOffline } from './useOffline';
import toast from 'react-hot-toast';

export const useEmailActions = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const userEmail = user?.email;
  const isOffline = useIsOffline();

  /**
   * Handle mark as read/unread with offline support
   */
  const handleToggleRead = useCallback(async (messageId: string, isRead: boolean) => {
    if (isOffline) {
      // Queue action for later
      if (isRead) {
        await offlineService.queueMarkAsUnread(messageId);
        toast.success('Will mark as unread when online', { icon: '📴' });
      } else {
        await offlineService.queueMarkAsRead(messageId);
        toast.success('Will mark as read when online', { icon: '📴' });
      }
      // Optimistically update UI via Redux
      if (isRead) {
        dispatch({ type: 'gmail/markAsUnread/fulfilled', payload: messageId });
      } else {
        dispatch({ type: 'gmail/markAsRead/fulfilled', payload: messageId });
      }
    } else {
      // Online - execute immediately
      if (isRead) {
        dispatch(markEmailAsUnread(messageId));
      } else {
        dispatch(markEmailAsRead(messageId));
      }
      // Update cache immediately to prevent stale offline state
      if (userEmail) {
        indexedDBService.updateEmailReadStatus(userEmail, messageId, !isRead).catch(console.error);
      }
    }
  }, [dispatch, isOffline]);

  /**
   * Handle toggle star with offline support
   */
  const handleToggleStar = useCallback(async (messageId: string, isStarred: boolean) => {
    const newStarred = !isStarred;

    if (isOffline) {
      await offlineService.queueToggleStar(messageId, newStarred);
      toast.success(newStarred ? 'Will star when online' : 'Will unstar when online', { icon: '📴' });
      // Optimistically update UI
      dispatch({ type: 'gmail/toggleStar/fulfilled', payload: { messageId, starred: newStarred } });
    } else {
      dispatch(toggleEmailStar({ messageId, starred: newStarred }));
      // Update cache immediately
      if (userEmail) {
        indexedDBService.updateEmailStarStatus(userEmail, messageId, newStarred).catch(console.error);
      }
    }
  }, [dispatch, isOffline]);

  /**
   * Handle delete email with offline support
   */
  const handleDeleteEmail = useCallback(async (messageId: string) => {
    if (isOffline) {
      await offlineService.queueDelete(messageId);
      toast.success('Will delete when online', { icon: '📴' });
      // Optimistically remove from UI
      dispatch({ type: 'gmail/deleteEmail/fulfilled', payload: messageId });
    } else {
      dispatch(deleteEmailAction(messageId))
        .unwrap()
        .then(() => {
          toast.success('Email moved to trash');
          if (userEmail) {
            indexedDBService.invalidateLabelCache(userEmail, 'TRASH').catch(console.error);
          }
        })
        .catch(() => {
          toast.error('Failed to delete email');
        });
    }
  }, [dispatch, userEmail, isOffline]);

  /**
   * Handle restore email (untrash) - requires network
   */
  const handleRestoreEmail = useCallback((messageId: string) => {
    if (isOffline) {
      toast.error('Cannot restore email while offline');
      return;
    }

    dispatch(untrashEmailAction(messageId))
      .unwrap()
      .then(() => {
        toast.success('Email restored');
        if (userEmail) {
          indexedDBService.invalidateLabelCache(userEmail, 'INBOX').catch(console.error);
        }
      })
      .catch(() => toast.error('Failed to restore email'));
  }, [dispatch, userEmail, isOffline]);

  /**
   * Handle move to inbox - requires network
   */
  const handleMoveToInbox = useCallback(async (messageId: string, labelId: string) => {
    if (isOffline) {
      toast.error('Cannot move email while offline');
      return;
    }

    try {
      await gmailService.moveToInbox(messageId);
      toast.success('Email moved to Inbox');
      dispatch(setSelectedMessage(null));
      if (userEmail) {
        indexedDBService.invalidateLabelCache(userEmail, 'INBOX').catch(console.error);
        dispatch(fetchMessages({ labelId, userEmail, forceRefresh: true }));
      }
    } catch (error) {
      toast.error('Failed to move email to Inbox');
      console.error('Move to inbox error:', error);
    }
  }, [dispatch, userEmail, isOffline]);

  /**
   * Handle permanently delete - requires network
   */
  const handlePermanentlyDelete = useCallback(async (messageId: string, labelId: string) => {
    if (isOffline) {
      toast.error('Cannot permanently delete while offline');
      return;
    }

    try {
      await gmailService.permanentlyDelete(messageId);
      toast.success('Email permanently deleted');
      dispatch(setSelectedMessage(null));
      if (userEmail) {
        indexedDBService.invalidateLabelCache(userEmail, labelId).catch(console.error);
        dispatch(fetchMessages({ labelId, userEmail, forceRefresh: true }));
      }
    } catch (error) {
      toast.error('Failed to permanently delete email');
      console.error('Permanently delete error:', error);
    }
  }, [dispatch, userEmail, isOffline]);

  /**
   * Refresh messages from network
   */
  const refreshMessages = useCallback((labelId: string) => {
    if (isOffline) {
      toast.error('Cannot refresh while offline');
      return;
    }

    if (userEmail) {
      dispatch(fetchMessages({ labelId, userEmail, forceRefresh: true }));
    }
  }, [dispatch, userEmail, isOffline]);

  /**
   * Handle bulk delete with offline support
   */
  const handleBulkDelete = useCallback(async (ids: string[]) => {
    if (isOffline) {
      // Queue each delete operation
      for (const id of ids) {
        await offlineService.queueDelete(id);
      }
      toast.success(`${ids.length} emails will be deleted when online`, { icon: '📴' });
      // Optimistically remove from UI
      dispatch({ type: 'gmail/batchDelete/fulfilled', payload: ids });
    } else {
      try {
        await dispatch(batchDeleteEmailsAction(ids)).unwrap();
        toast.success(`${ids.length} emails moved to trash`);
        if (userEmail) {
          indexedDBService.invalidateLabelCache(userEmail, 'TRASH').catch(console.error);
        }
      } catch {
        toast.error('Failed to delete emails');
      }
    }
  }, [dispatch, userEmail, isOffline]);

  /**
   * Handle bulk mark as read/unread with offline support
   */
  const handleBulkMarkRead = useCallback(async (ids: string[], isRead: boolean) => {
    if (isOffline) {
      for (const id of ids) {
        if (isRead) {
          await offlineService.queueMarkAsRead(id);
        } else {
          await offlineService.queueMarkAsUnread(id);
        }
      }
      toast.success(`Will update ${ids.length} emails when online`, { icon: '📴' });
      // Optimistically update UI
      dispatch({ type: 'gmail/batchUpdateStatus/fulfilled', payload: { ids, isRead } });
    } else {
      try {
        await dispatch(batchUpdateStatusAction({ ids, isRead })).unwrap();
      } catch (error) {
        console.error('Failed to update read status', error);
      }
    }
  }, [dispatch, isOffline]);

  /**
   * Handle snooze email - requires network
   */
  const handleSnoozeEmail = useCallback(async (messageId: string, snoozedUntil: string, labelId: string) => {
    if (isOffline) {
      toast.error('Cannot snooze email while offline');
      return;
    }

    try {
      await gmailService.snoozeEmail(messageId, snoozedUntil);
      toast.success('Email snoozed successfully');
      if (userEmail) {
        dispatch(fetchMessages({ labelId, userEmail, forceRefresh: true }));
      }
    } catch (error) {
      toast.error('Failed to snooze email');
      console.error('Snooze error:', error);
    }
  }, [dispatch, userEmail, isOffline]);

  return {
    handleToggleRead,
    handleToggleStar,
    handleDeleteEmail,
    handleRestoreEmail,
    handleMoveToInbox,
    handlePermanentlyDelete,
    refreshMessages,
    handleBulkDelete,
    handleBulkMarkRead,
    handleSnoozeEmail,
    isOffline, // Expose offline status for UI feedback
  };
};
