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
import React from 'react';

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
        toast.success(
          (t) => (
            React.createElement('div', { className: 'flex items-center gap-3' },
              React.createElement('span', null, 'Email moved to trash'),
              React.createElement('button', {
                onClick: () => {
                  dispatch(untrashEmailAction(messageId));
                  toast.dismiss(t.id);
                  toast.success('Email restored');
                },
                className: 'px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium'
              }, 'Undo')
            )
          ),
          { duration: 5000 }
        );
      })
      .catch(() => {
        toast.error('Failed to delete email');
      });
  }, [dispatch]);

  const handleRestoreEmail = useCallback((messageId: string) => {
    dispatch(untrashEmailAction(messageId))
      .unwrap()
      .then(() => toast.success('Email restored to Inbox'))
      .catch(() => toast.error('Failed to restore email'));
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
    refreshMessages,
    handleBulkDelete,
    handleBulkMarkRead,
    handleSnoozeEmail
  };
};
