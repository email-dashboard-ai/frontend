
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchLabels,
  fetchMessages,
  fetchMoreMessages,
  setSelectedLabel,
  setSelectedMessage,
  clearMessages
} from '../store/slices/gmailSlice';
import { logout } from '../store/slices/authSlice';
import { GmailLabel, ParsedEmail, SearchResult } from '../types/gmail';
import { LogOut, X, LayoutGrid, List as ListIcon } from 'lucide-react';
import { gmailService } from '../services/gmailService';

// Components
import EmailSidebar from '../components/email/EmailSidebar';
import EmailList from '../components/email/EmailList';
import EmailDetail from '../components/email/EmailDetail';
import ComposeEmailModal from '../components/email/ComposeEmailModal';
import KanbanView from '../components/email/KanbanView';
import SearchPanel from '../components/email/SearchPanel';
import SearchResults from '../components/email/SearchResults';
import KeyboardShortcutsModal from '../components/email/KeyboardShortcutsModal';

// Hooks
import { useResizableLayout } from '../hooks/useResizableLayout';
import { useEmailActions } from '../hooks/useEmailActions';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';

const EmailDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { labels, selectedLabel, messages, selectedMessage, isLoading, error, nextPageToken } = useAppSelector(state => state.gmail);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileDetailView, setIsMobileDetailView] = useState(false);
  const [pageToken, setPageToken] = useState<string | undefined>(undefined);
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [kanbanStatuses, setKanbanStatuses] = useState<Record<string, string>>({});
  const [snoozedInfo, setSnoozedInfo] = useState<Record<string, string>>({});
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(media.matches);
    update();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    // Safari fallback
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const fetchKanbanStatuses = useCallback(async () => {
    try {
      const statuses = await gmailService.getKanbanStatuses();
      setKanbanStatuses(statuses);
    } catch (error) {
      console.error('Failed to fetch kanban statuses', error);
    }
  }, []);

  const fetchSnoozedInfo = useCallback(async () => {
    try {
      const info = await gmailService.getSnoozedEmailsInfo();
      setSnoozedInfo(info);
    } catch (error) {
      console.error('Failed to fetch snoozed info', error);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'kanban') {
      fetchKanbanStatuses();
    }
  }, [viewMode, fetchKanbanStatuses]);

  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());

  // Custom Hooks
  const { sidebarWidth, listWidth, startResizingSidebar, startResizingList } = useResizableLayout();
  const { handleToggleRead, handleToggleStar, handleDeleteEmail, handleMoveToInbox, handlePermanentlyDelete, refreshMessages, handleBulkDelete, handleBulkMarkRead, handleSnoozeEmail } = useEmailActions();

  // Keyboard Navigation Hook (List view only)
  useKeyboardNavigation({
    messages,
    selectedMessage,
    onSelectMessage: (message) => {
      dispatch(setSelectedMessage(message));
      // Mark as read when selecting via keyboard
      if (message && !message.isRead) {
        handleToggleRead(message.id, false);
      }
    },
    onDeleteMessage: handleDeleteEmail,
    onToggleStar: handleToggleStar,
    onFocusSearch: () => {
      const searchInput = document.querySelector('input[placeholder="Search mail"]') as HTMLInputElement;
      searchInput?.focus();
    },
    enabled: viewMode === 'list' && !isSearchActive && !isComposeOpen && !showShortcutsModal,
  });

  // Listen for ? key to TOGGLE shortcuts modal, and Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTyping = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA';

      // ? to toggle modal
      if (e.key === '?' && !isTyping) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
      }

      // Esc to close modal
      if (e.key === 'Escape' && showShortcutsModal) {
        e.preventDefault();
        setShowShortcutsModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShortcutsModal]);

  const handleUnsnoozeEmail = useCallback(async (emailId: string) => {
    try {
      await gmailService.unsnoozeEmail(emailId);
      // Refresh messages and snoozed info
      if (selectedLabel) {
        refreshMessages(selectedLabel.id);
      }
      fetchSnoozedInfo();
    } catch (error) {
      console.error('Failed to unsnooze email', error);
    }
  }, [selectedLabel, refreshMessages, fetchSnoozedInfo]);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchLabels());
  }, [dispatch]);

  // Fetch snoozed info when SNOOZED label is selected
  useEffect(() => {
    if (selectedLabel?.name === 'SNOOZED') {
      fetchSnoozedInfo();
    }
  }, [selectedLabel, fetchSnoozedInfo]);

  useEffect(() => {
    if (!selectedLabel && labels.length > 0) {
      const inbox = labels.find((l: GmailLabel) => l.id === 'INBOX');
      if (inbox) {
        dispatch(setSelectedLabel(inbox));
      }
    }
  }, [labels, selectedLabel, dispatch]);

  useEffect(() => {
    if (selectedLabel) {
      dispatch(clearMessages());
      setPageToken(undefined);
      setHistoryStack([]);
      setSelectedEmailIds(new Set());
      dispatch(fetchMessages({ labelId: selectedLabel.id }));
    }
  }, [selectedLabel, dispatch]);

  const toggleEmailSelection = useCallback((id: string) => {
    setSelectedEmailIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleNextPage = () => {
    if (nextPageToken && selectedLabel) {
      setHistoryStack(prev => [...prev, pageToken || '']);
      setPageToken(nextPageToken);
      dispatch(fetchMessages({ labelId: selectedLabel.id, pageToken: nextPageToken }));
    }
  };

  const handlePrevPage = () => {
    if (historyStack.length > 0 && selectedLabel) {
      const prevToken = historyStack[historyStack.length - 1];
      const newStack = historyStack.slice(0, -1);
      setHistoryStack(newStack);
      setPageToken(prevToken === '' ? undefined : prevToken);
      dispatch(fetchMessages({ labelId: selectedLabel.id, pageToken: prevToken === '' ? undefined : prevToken }));
    }
  };

  const handleLoadMore = useCallback(() => {
    if (nextPageToken && selectedLabel && !isLoading) {
      // Don't modify pageToken state directly as it affects list pagination
      // Just fetch more messages to append
      dispatch(fetchMoreMessages({ labelId: selectedLabel.id, pageToken: nextPageToken }));
    }
  }, [nextPageToken, selectedLabel, isLoading, dispatch]);

  const handleLabelClick = (label: GmailLabel) => {
    dispatch(setSelectedLabel(label));
    setIsMobileDetailView(false);
  };

  const handleMessageClick = (message: ParsedEmail) => {
    dispatch(setSelectedMessage(message));

    // On mobile, switch to detail view
    if (isMobile) {
      setIsMobileDetailView(true);
    }

    // Mark as read if unread
    if (!message.isRead) {
      handleToggleRead(message.id, false);
    }
  };

  const handleBackToKanban = useCallback(() => {
    setIsMobileDetailView(false);
    dispatch(setSelectedMessage(null));
  }, [dispatch]);

  const handleKanbanUpdateStatus = useCallback(async (id: string, newStatus: 'inbox' | 'important' | 'done') => {
    try {
      // Optimistic update
      let backendStatus = 'INBOX';
      if (newStatus === 'important') backendStatus = 'IN_PROGRESS';
      else if (newStatus === 'done') backendStatus = 'DONE';

      setKanbanStatuses(prev => ({ ...prev, [id]: backendStatus }));

      await gmailService.updateKanbanStatus(id, newStatus);
      // fetchKanbanStatuses(); // No need to fetch if optimistic update works, but maybe safer to fetch
    } catch (error) {
      console.error('Failed to update email status:', error);
      fetchKanbanStatuses(); // Revert on error
    }
  }, [fetchKanbanStatuses]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Toaster position="bottom-center" />
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex-shrink-0 z-50 select-none">
        <div className="h-full px-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Left Section - Logo & Title */}
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-lg shadow-md" />
            <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">
              {viewMode === 'kanban' ? 'Kanban Dashboard' : 'Gmail Dashboard'}
            </h1>
          </div>

          {/* Center Section - Search & View Toggle (fixed position) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="w-[500px]">
              <SearchPanel
                onSearchResults={(results) => {
                  setSearchResults(results);
                  setIsSearchActive(true);
                }}
                onClearSearch={() => {
                  setSearchResults([]);
                  setIsSearchActive(false);
                }}
                isSearchActive={isSearchActive}
              />
            </div>

            {/* View Toggle - Pill Style */}
            <div className="flex bg-gray-100 p-1 rounded-full border border-gray-200 flex-shrink-0">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-full transition-all flex items-center justify-center ${viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
                title="List View"
              >
                <ListIcon size={18} />
              </button>
              <button
                onClick={() => {
                  setViewMode('kanban');
                  setIsMobileDetailView(false);
                  dispatch(setSelectedMessage(null));
                }}
                className={`p-2 rounded-full transition-all flex items-center justify-center ${viewMode === 'kanban'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
                title="Kanban Board"
              >
                <LayoutGrid size={18} />
              </button>
            </div>
          </div>

          {/* Right Section - User & Logout */}
          <div className="flex items-center gap-4 justify-end">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700 overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user?.name?.[0] || 'U'
                )}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden md:block">
                {user?.name || 'User'}
              </span>
            </div>
            <button
              onClick={() => dispatch(logout())}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between">
          <p className="text-red-800 text-sm">{error}</p>
          <button className="text-red-600 hover:text-red-800"><X size={16} /></button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {viewMode === 'list' ? (
          <>
            <EmailSidebar
              sidebarWidth={sidebarWidth}
              isMobileDetailView={isMobileDetailView}
              labels={labels}
              selectedLabel={selectedLabel}
              isLoading={isLoading}
              onLabelClick={handleLabelClick}
              sidebarRef={sidebarRef}
              onCompose={() => setIsComposeOpen(true)}
              onShowShortcuts={() => setShowShortcutsModal(true)}
            />

            <div
              className="w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-20 hidden md:block select-none"
              onMouseDown={startResizingSidebar}
            />

            {isSearchActive ? (
              <SearchResults
                results={searchResults}
                onSelectResult={async (messageId) => {
                  try {
                    const message = await gmailService.getMessage(messageId);
                    dispatch(setSelectedMessage(message));
                    if (isMobile) setIsMobileDetailView(true);
                  } catch (e) {
                    console.error('Failed to load message', e);
                  }
                }}
                onBack={() => {
                  setIsSearchActive(false);
                  setSearchResults([]);
                }}
              />
            ) : (
              <EmailList
                listWidth={listWidth}
                isMobileDetailView={isMobileDetailView}
                messages={messages}
                selectedMessage={selectedMessage}
                selectedLabel={selectedLabel}
                isLoading={isLoading}
                searchQuery=""
                onRefresh={() => selectedLabel && refreshMessages(selectedLabel.id)}
                onMessageClick={handleMessageClick}
                listRef={listRef}
                onToggleStar={handleToggleStar}
                onDelete={handleDeleteEmail}
                selectedIds={selectedEmailIds}
                onToggleSelection={toggleEmailSelection}
                onBulkDelete={(ids) => {
                  handleBulkDelete(ids);
                  setSelectedEmailIds(new Set());
                }}
                onBulkMarkRead={(ids, isRead) => {
                  handleBulkMarkRead(ids, isRead);
                  setSelectedEmailIds(new Set());
                }}
                onClearSelection={() => setSelectedEmailIds(new Set())}
                onNextPage={handleNextPage}
                onPrevPage={handlePrevPage}
                hasNextPage={!!nextPageToken}
                hasPrevPage={historyStack.length > 0}
                onSnooze={(emailId, snoozedUntil) => {
                  if (selectedLabel) {
                    handleSnoozeEmail(emailId, snoozedUntil, selectedLabel.id);
                  }
                }}
                snoozedInfo={snoozedInfo}
                onUnsnooze={handleUnsnoozeEmail}
                onMoveToInbox={(emailId) => {
                  if (selectedLabel) {
                    handleMoveToInbox(emailId, selectedLabel.id);
                  }
                }}
                onPermanentlyDelete={(emailId) => {
                  if (selectedLabel) {
                    handlePermanentlyDelete(emailId, selectedLabel.id);
                  }
                }}
              />
            )}

            <div
              className="w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-20 hidden md:block select-none"
              onMouseDown={startResizingList}
            />

            <EmailDetail
              isMobileDetailView={isMobileDetailView}
              setIsMobileDetailView={setIsMobileDetailView}
              selectedMessage={selectedMessage}
              isLoading={isLoading}
              selectedLabel={selectedLabel}
              onToggleStar={handleToggleStar}
              onToggleRead={handleToggleRead}
              onDelete={handleDeleteEmail}
              onMoveToInbox={(emailId) => {
                if (selectedLabel) {
                  handleMoveToInbox(emailId, selectedLabel.id);
                }
              }}
              onPermanentlyDelete={(emailId) => {
                if (selectedLabel) {
                  handlePermanentlyDelete(emailId, selectedLabel.id);
                }
              }}
            />
          </>
        ) : (
          <>
            {isMobile && isMobileDetailView && selectedMessage ? (
              <EmailDetail
                isMobileDetailView={isMobileDetailView}
                setIsMobileDetailView={setIsMobileDetailView}
                selectedMessage={selectedMessage}
                isLoading={isLoading}
                selectedLabel={selectedLabel}
                onToggleStar={handleToggleStar}
                onToggleRead={handleToggleRead}
                onDelete={handleDeleteEmail}
                onMoveToInbox={(emailId) => {
                  if (selectedLabel) {
                    handleMoveToInbox(emailId, selectedLabel.id);
                  }
                }}
                onPermanentlyDelete={(emailId) => {
                  if (selectedLabel) {
                    handlePermanentlyDelete(emailId, selectedLabel.id);
                  }
                }}
                onBack={handleBackToKanban}
              />
            ) : (
              <div className="w-full h-full">
                <KanbanView
                  messages={messages}
                  labels={labels}
                  kanbanStatuses={kanbanStatuses}
                  onMessageClick={handleMessageClick}
                  onToggleStar={handleToggleStar}
                  onUpdateStatus={handleKanbanUpdateStatus}
                  onSnooze={(emailId, snoozedUntil) => {
                    if (selectedLabel) {
                      handleSnoozeEmail(emailId, snoozedUntil, selectedLabel.id);
                    }
                  }}
                  onLoadMore={handleLoadMore}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Compose Email Modal */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
};

export default EmailDashboard;
