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
import toast from 'react-hot-toast';

export const useEmailActions = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const userEmail = user?.email;

  const handleToggleRead = useCallback((messageId: string, isRead: boolean) => {
    if (isRead) {
      dispatch(markEmailAsUnread(messageId));
    } else {
      dispatch(markEmailAsRead(messageId));
    }
  }, [dispatch]);

  const handleToggleStar = useCallback((messageId: string, isStarred: boolean) => {
    dispatch(toggleEmailStar({ messageId, starred: !isStarred }));
  }, [dispatch]);

  const handleDeleteEmail = useCallback((messageId: string) => {
    dispatch(deleteEmailAction(messageId))
      .unwrap()
      .then(() => {
        toast.success('Email moved to trash');
        // Invalidate TRASH cache so it shows fresh data when user visits TRASH
        if (userEmail) {
          indexedDBService.invalidateLabelCache(userEmail, 'TRASH').catch(console.error);
        }
      })
      .catch(() => {
        toast.error('Failed to delete email');
      });
  }, [dispatch, userEmail]);

  const handleRestoreEmail = useCallback((messageId: string) => {
    dispatch(untrashEmailAction(messageId))
      .unwrap()
      .then(() => {
        toast.success('Email restored');
        // Invalidate INBOX cache so it shows fresh data when user visits INBOX
        if (userEmail) {
          indexedDBService.invalidateLabelCache(userEmail, 'INBOX').catch(console.error);
        }
      })
      .catch(() => toast.error('Failed to restore email'));
  }, [dispatch, userEmail]);

  const handleMoveToInbox = useCallback(async (messageId: string, labelId: string) => {
    try {
      await gmailService.moveToInbox(messageId);
      toast.success('Email moved to Inbox');
      // Clear the selected message since it was moved out of current label
      dispatch(setSelectedMessage(null));
      // Refresh the current label to update the list
      if (userEmail) {
        // Invalidate INBOX cache so it shows the moved email
        indexedDBService.invalidateLabelCache(userEmail, 'INBOX').catch(console.error);
        dispatch(fetchMessages({ labelId, userEmail, forceRefresh: true }));
      }
    } catch (error) {
      toast.error('Failed to move email to Inbox');
      console.error('Move to inbox error:', error);
    }
  }, [dispatch, userEmail]);

  const handlePermanentlyDelete = useCallback(async (messageId: string, labelId: string) => {
    try {
      await gmailService.permanentlyDelete(messageId);
      toast.success('Email permanently deleted');
      // Clear the selected message FIRST since it was permanently deleted
      dispatch(setSelectedMessage(null));
      // Refresh the current label (TRASH/SPAM) to update the list
      if (userEmail) {
        // Invalidate the label cache
        indexedDBService.invalidateLabelCache(userEmail, labelId).catch(console.error);
        dispatch(fetchMessages({ labelId, userEmail, forceRefresh: true }));
      }
    } catch (error) {
      toast.error('Failed to permanently delete email');
      console.error('Permanently delete error:', error);
    }
  }, [dispatch, userEmail]);

  const refreshMessages = useCallback((labelId: string) => {
    if (userEmail) {
      // Force refresh: bypass cache and show loading state
      dispatch(fetchMessages({ labelId, userEmail, forceRefresh: true }));
    }
  }, [dispatch, userEmail]);

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    try {
      await dispatch(batchDeleteEmailsAction(ids)).unwrap();
      toast.success(`${ids.length} emails moved to trash`);
      // Invalidate TRASH cache so it shows fresh data when user visits TRASH
      if (userEmail) {
        indexedDBService.invalidateLabelCache(userEmail, 'TRASH').catch(console.error);
      }
    } catch {
      toast.error('Failed to delete emails');
    }
  }, [dispatch, userEmail]);

  const handleBulkMarkRead = useCallback(async (ids: string[], isRead: boolean) => {
    try {
      await dispatch(batchUpdateStatusAction({ ids, isRead })).unwrap();
    } catch (error) {
      console.error('Failed to update read status', error);
    }
  }, [dispatch]);

  const handleSnoozeEmail = useCallback(async (messageId: string, snoozedUntil: string, labelId: string) => {
    try {
      await gmailService.snoozeEmail(messageId, snoozedUntil);
      toast.success('Email snoozed successfully');
      // Refresh the current label to remove the snoozed email
      if (userEmail) {
        // Invalidate SNOOZED label cache so it shows fresh data when user visits SNOOZED
        // Note: SNOOZED is a custom label, need to find its ID
        dispatch(fetchMessages({ labelId, userEmail, forceRefresh: true }));
      }
    } catch (error) {
      toast.error('Failed to snooze email');
      console.error('Snooze error:', error);
    }
  }, [dispatch, userEmail]);

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
    handleSnoozeEmail
  };
};
