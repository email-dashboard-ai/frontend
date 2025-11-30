
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchLabels,
  fetchMessages,
  fetchMessage,
  setSelectedLabel,
  setSelectedMessage,
  clearMessages
} from '../store/slices/gmailSlice';
import { logout } from '../store/slices/authSlice';
import { GmailLabel, ParsedEmail } from '../types/gmail';
import { Mail, LogOut, X } from 'lucide-react';

// Components
import EmailSidebar from '../components/email/EmailSidebar';
import EmailList from '../components/email/EmailList';
import EmailDetail from '../components/email/EmailDetail';

// Hooks
import { useResizableLayout } from '../hooks/useResizableLayout';
import { useEmailActions } from '../hooks/useEmailActions';

const EmailDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { labels, selectedLabel, messages, selectedMessage, isLoading, error, nextPageToken } = useAppSelector(state => state.gmail);

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileDetailView, setIsMobileDetailView] = useState(false);
  const [pageToken, setPageToken] = useState<string | undefined>(undefined);
  const [historyStack, setHistoryStack] = useState<string[]>([]);

  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());

  // Custom Hooks
  const { sidebarWidth, listWidth, startResizingSidebar, startResizingList } = useResizableLayout();
  const { handleToggleRead, handleToggleStar, handleDeleteEmail, handleRestoreEmail, refreshMessages, handleBulkDelete, handleBulkMarkRead } = useEmailActions();

  const sidebarRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchLabels());
  }, [dispatch]);

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

  const handleLabelClick = (label: GmailLabel) => {
    dispatch(setSelectedLabel(label));
    setIsMobileDetailView(false);
  };

  const handleMessageClick = (message: ParsedEmail) => {
    dispatch(setSelectedMessage(message));
    dispatch(fetchMessage(message.id));
    setIsMobileDetailView(true);

    if (!message.isRead) {
      handleToggleRead(message.id, false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Toaster position="bottom-center" />
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-10 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
            <Mail className="text-white" size={22} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Gmail Dashboard</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700">
              {user?.name?.[0] || 'U'}
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
        <EmailSidebar
          sidebarWidth={sidebarWidth}
          isMobileDetailView={isMobileDetailView}
          labels={labels}
          selectedLabel={selectedLabel}
          isLoading={isLoading}
          onLabelClick={handleLabelClick}
          sidebarRef={sidebarRef}
        />

        <div
          className="w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-20 hidden md:block select-none"
          onMouseDown={startResizingSidebar}
        />

        <EmailList
          listWidth={listWidth}
          isMobileDetailView={isMobileDetailView}
          messages={messages}
          selectedMessage={selectedMessage}
          selectedLabel={selectedLabel}
          isLoading={isLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
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
        />

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
          onRestore={handleRestoreEmail}
        />
      </div>
    </div>
  );
};

export default EmailDashboard;
