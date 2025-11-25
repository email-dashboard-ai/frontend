import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  fetchEmails,
  setCurrentView,
  setSearchQuery,
  moveEmailToColumn,
  reorderEmailsInColumn,
  openSnoozeModal,
  closeSnoozeModal,
  clearError
} from '../store/slices/emailSlice';
import type { Email } from '../types';

/**
 * Custom hook quản lý toàn bộ email logic
 * - Fetch emails on mount
 * - Search functionality
 * - Column organization
 * - Drag & drop
 */
export const useEmails = () => {
  const dispatch = useAppDispatch();
  const { 
    emails, 
    searchQuery, 
    searchResults, 
    currentView, 
    snoozeModalOpen,
    error,
    isLoading
  } = useAppSelector(state => state.email);

  // Fetch emails on mount
  useEffect(() => {
    dispatch(fetchEmails());
  }, [dispatch]);

  // Organize emails by column
  const emailsByColumn = useMemo(() => {
    return {
      inbox: emails.filter(e => e.column === 'inbox').sort((a, b) => a.order - b.order),
      todo: emails.filter(e => e.column === 'todo').sort((a, b) => a.order - b.order),
      done: emails.filter(e => e.column === 'done').sort((a, b) => a.order - b.order),
    };
  }, [emails]);

  // Actions
  const handleSearch = (query: string) => {
    dispatch(setSearchQuery(query));
    if (query.trim()) {
      dispatch(setCurrentView('search'));
    } else {
      dispatch(setCurrentView('board'));
    }
  };

  const handleClearSearch = () => {
    dispatch(setSearchQuery(''));
    dispatch(setCurrentView('board'));
  };

  const handleMoveEmail = (emailId: string, targetColumn: Email['column']) => {
    dispatch(moveEmailToColumn({ emailId, column: targetColumn }));
  };

  const handleReorderEmails = (draggedId: string, hoveredId: string, column: Email['column']) => {
    const draggedEmail = emails.find(e => e.id === draggedId);
    if (draggedEmail && draggedEmail.column !== column) {
      dispatch(moveEmailToColumn({ emailId: draggedId, column }));
    }
    dispatch(reorderEmailsInColumn({ draggedId, hoveredId, column }));
  };

  const handleSnoozeEmail = (email: Email) => {
    dispatch(openSnoozeModal(email));
  };

  const handleCloseSnoozeModal = () => {
    dispatch(closeSnoozeModal());
  };

  const handleStatusChange = (emailId: string, newColumn: Email['column']) => {
    dispatch(moveEmailToColumn({ emailId, column: newColumn }));
  };

  const handleClearError = () => {
    dispatch(clearError());
  };

  return {
    // State
    emails,
    emailsByColumn,
    searchQuery,
    searchResults,
    currentView,
    snoozeModalOpen,
    error,
    isLoading,
    
    // Actions
    handleSearch,
    handleClearSearch,
    handleMoveEmail,
    handleReorderEmails,
    handleSnoozeEmail,
    handleCloseSnoozeModal,
    handleStatusChange,
    handleClearError,
  };
};
