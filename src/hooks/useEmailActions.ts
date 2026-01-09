import { useCallback } from 'react';
import { useAppDispatch } from '../store';
import {
  markEmailAsRead,
  markEmailAsUnread,
  toggleEmailStar,
  deleteEmailAction,
  untrashEmailAction,
  fetchMessages,
  batchDeleteEmailsAction,
  batchUpdateStatusAction
} from '../store/slices/gmailSlice';
import { gmailService } from '../services/gmailService';
import toast from 'react-hot-toast';

export const useEmailActions = () => {
  const dispatch = useAppDispatch();

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
      })
      .catch(() => {
        toast.error('Failed to delete email');
      });
  }, [dispatch]);

  const handleRestoreEmail = useCallback((messageId: string) => {
    dispatch(untrashEmailAction(messageId))
      .unwrap()
      .then(() => toast.success('Email restored'))
      .catch(() => toast.error('Failed to restore email'));
  }, [dispatch]);

  const handleMoveToInbox = useCallback(async (messageId: string, labelId: string) => {
    try {
      await gmailService.moveToInbox(messageId);
      toast.success('Email moved to Inbox');
      // Refresh the current label to update the list
      dispatch(fetchMessages({ labelId }));
    } catch (error) {
      toast.error('Failed to move email to Inbox');
      console.error('Move to inbox error:', error);
    }
  }, [dispatch]);

  const handlePermanentlyDelete = useCallback(async (messageId: string, labelId: string) => {
    try {
      await gmailService.permanentlyDelete(messageId);
      toast.success('Email permanently deleted');
      // Refresh the current label to update the list
      dispatch(fetchMessages({ labelId }));
    } catch (error) {
      toast.error('Failed to permanently delete email');
      console.error('Permanently delete error:', error);
    }
  }, [dispatch]);

  const refreshMessages = useCallback((labelId: string) => {
    dispatch(fetchMessages({ labelId }));
  }, [dispatch]);

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    try {
      await dispatch(batchDeleteEmailsAction(ids)).unwrap();
      toast.success(`${ids.length} emails moved to trash`);
    } catch (error) {
      toast.error('Failed to delete emails');
    }
  }, [dispatch]);

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
      dispatch(fetchMessages({ labelId }));
    } catch (error) {
      toast.error('Failed to snooze email');
      console.error('Snooze error:', error);
    }
  }, [dispatch]);

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
