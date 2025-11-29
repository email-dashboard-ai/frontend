import React, { useEffect, useState, useRef, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchLabels,
  fetchMessages,
  fetchMessage,
  setSelectedLabel,
  setSelectedMessage,
  markEmailAsRead,
  markEmailAsUnread,
  toggleEmailStar,
  deleteEmailAction,
  untrashEmailAction
} from '../store/slices/gmailSlice';
import { logout } from '../store/slices/authSlice';
import type { GmailLabel, ParsedEmail } from '../types/gmail';
import {
  Inbox, Star, Send, FileText, Trash2, Folder, Search, RefreshCw,
  Mail, MailOpen, Paperclip, Reply, ReplyAll, Forward, LogOut,
  Loader2, ChevronLeft, X, Menu
} from 'lucide-react';

const EmailDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { labels, selectedLabel, messages, selectedMessage, isLoading, error } = useAppSelector(state => state.gmail);

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileDetailView, setIsMobileDetailView] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Resizable columns state
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [listWidth, setListWidth] = useState(350);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingList, setIsResizingList] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchLabels());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedLabel && labels.length > 0) {
      const inbox = labels.find(l => l.id === 'INBOX');
      if (inbox) {
        dispatch(setSelectedLabel(inbox));
      }
    }
  }, [labels, selectedLabel, dispatch]);

  useEffect(() => {
    if (selectedLabel) {
      setPage(1);
      setHasMore(true);
      dispatch(fetchMessages({ labelId: selectedLabel.id, page: 1 }));
    }
  }, [selectedLabel, dispatch]);

  const loadMoreMessages = useCallback(() => {
    if (!isLoading && hasMore && selectedLabel) {
      const nextPage = page + 1;
      setPage(nextPage);
      dispatch(fetchMessages({ labelId: selectedLabel.id, page: nextPage, isLoadMore: true }))
        .unwrap()
        .then((result) => {
          if (result.messages.length === 0) {
            setHasMore(false);
          }
        })
        .catch(() => {
          setPage(prev => prev - 1); // Revert on error
        });
    }
  }, [isLoading, hasMore, selectedLabel, page, dispatch]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) { // Load when within 50px of bottom
      loadMoreMessages();
    }
  }, [loadMoreMessages]);

  // Resize handlers
  const startResizingSidebar = useCallback(() => setIsResizingSidebar(true), []);
  const startResizingList = useCallback(() => setIsResizingList(true), []);
  const stopResizing = useCallback(() => {
    setIsResizingSidebar(false);
    setIsResizingList(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizingSidebar) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth > 150 && newWidth < 400) {
        setSidebarWidth(newWidth);
      }
    }
    if (isResizingList) {
      const newWidth = mouseMoveEvent.clientX - sidebarWidth;
      if (newWidth > 300 && newWidth < 800) {
        setListWidth(newWidth);
      }
    }
  }, [isResizingSidebar, isResizingList, sidebarWidth]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const handleLabelClick = (label: GmailLabel) => {
    dispatch(setSelectedLabel(label));
    setIsMobileDetailView(false);
  };

  const handleMessageClick = (message: ParsedEmail) => {
    console.log('Message clicked:', message);
    dispatch(setSelectedMessage(message));
    dispatch(fetchMessage(message.id));
    setIsMobileDetailView(true);

    // Auto mark as read when opening email
    if (!message.isRead) {
      dispatch(markEmailAsRead(message.id));
    }
  };

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
            <div className="flex items-center gap-3">
              <span>Email moved to trash</span>
              <button
                onClick={() => {
                  dispatch(untrashEmailAction(messageId));
                  toast.dismiss(t.id);
                  toast.success('Email restored');
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                Undo
              </button>
            </div>
          ),
          { duration: 5000 }
        );
      })
      .catch(() => {
        toast.error('Failed to delete email');
      });
  }, [dispatch]);

  const getLabelIcon = (labelId: string) => {
    const icons: Record<string, React.ReactNode> = {
      'INBOX': <Inbox size={18} />,
      'STARRED': <Star size={18} />,
      'SENT': <Send size={18} />,
      'DRAFT': <FileText size={18} />,
      'TRASH': <Trash2 size={18} />,
    };
    return icons[labelId] || <Folder size={18} />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const extractName = (emailString: string) => {
    const match = emailString.match(/^"?([^"<]+)"?\s*</);
    return match ? match[1].trim() : emailString.split('@')[0];
  };

  const extractEmail = (emailString: string) => {
    const match = emailString.match(/<(.+)>/);
    return match ? match[1] : emailString;
  };

  const filteredMessages = messages.filter(msg =>
    msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLabelPriority = (labelId: string) => {
    const priorities: Record<string, number> = {
      'INBOX': 1,
      'STARRED': 2,
      'IMPORTANT': 3,
      'SENT': 4,
      'DRAFT': 5,
      'TRASH': 6,
      'SPAM': 7,
    };
    return priorities[labelId] || 100;
  };

  const visibleLabels = labels
    .filter(l => !l.id.startsWith('CATEGORY_') && !['CHAT', 'YELLOW_STAR', 'UNREAD'].includes(l.id))
    .sort((a, b) => getLabelPriority(a.id) - getLabelPriority(b.id));

  const isInTrash = selectedLabel?.id === 'TRASH';

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Toaster position="bottom-center" />
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-10 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
            title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            <Menu size={20} />
          </button>
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

      {/* Main Content - Resizable Columns */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Column 1: Mailboxes */}
        <aside
          ref={sidebarRef}
          className={`bg-white border-r border-gray-200 flex-shrink-0 flex flex-col ${isMobileDetailView ? 'hidden md:flex' : 'flex'} w-full md:w-[var(--sidebar-width)]`}
          style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
        >
          <div className="p-4">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 font-medium flex items-center justify-center gap-2 transition-colors shadow-sm">
              <Mail size={18} />
              Compose
            </button>
          </div>

          <nav className="px-2 flex-1 overflow-y-auto custom-scrollbar select-none">
            {isLoading && labels.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-gray-400" size={24} />
              </div>
            ) : (
              visibleLabels.map(label => (
                <button
                  key={label.id}
                  onClick={() => handleLabelClick(label)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 transition-colors ${selectedLabel?.id === label.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {getLabelIcon(label.id)}
                    <span className="text-sm truncate">{label.name}</span>
                  </div>
                  {label.messagesUnread ? (
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {label.messagesUnread}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </nav>
        </aside>

        {/* Resizer 1 */}
        <div
          className="w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-20 hidden md:block select-none"
          onMouseDown={startResizingSidebar}
        />

        {/* Column 2: Email List */}
        <div
          ref={listRef}
          className={`bg-white border-r border-gray-200 flex flex-col flex-shrink-0 ${isMobileDetailView ? 'hidden md:flex' : 'flex'} w-full md:w-[var(--list-width)]`}
          style={{ '--list-width': `${listWidth}px` } as React.CSSProperties}
        >
          <div className="border-b border-gray-200 p-4 flex-shrink-0 bg-white z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <button
                onClick={() => selectedLabel && dispatch(fetchMessages({ labelId: selectedLabel.id }))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw size={18} className="text-gray-600" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 truncate pr-2">{selectedLabel?.name || 'Select a folder'}</h2>
              <span className="text-xs text-gray-500 whitespace-nowrap">{filteredMessages.length} emails</span>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto custom-scrollbar select-none"
            onScroll={handleScroll}
          >
            {isLoading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-gray-400" size={32} />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4 text-center">
                <Mail size={48} className="mb-3 opacity-50" />
                <p>No data available</p>
              </div>
            ) : (
              filteredMessages.map(message => (
                <div
                  key={message.id}
                  className={`border-b border-gray-100 p-4 transition-all group ${selectedMessage?.id === message.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                    } ${!message.isRead ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div
                      className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleMessageClick(message)}
                    >
                      {message.isStarred && <Star size={14} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                      <span className={`text-sm truncate ${!message.isRead ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                        {extractName(message.from)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs mr-2 flex-shrink-0 ${!message.isRead ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                        {formatDate(message.date)}
                      </span>
                      {/* Quick actions */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStar(message.id, message.isStarred);
                        }}
                        className="p-1.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title={message.isStarred ? 'Remove star' : 'Add star'}
                      >
                        <Star size={16} className={message.isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'} />
                      </button>
                      {!isInTrash && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEmail(message.id);
                          }}
                          className="p-1.5 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-gray-400 hover:text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3
                    className={`text-sm mb-1 truncate cursor-pointer ${!message.isRead ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                    onClick={() => handleMessageClick(message)}
                  >
                    {message.subject || '(No Subject)'}
                  </h3>

                  <p className="text-xs text-gray-500 truncate line-clamp-1">{message.snippet}</p>

                  {message.attachments.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Paperclip size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500">{message.attachments.length} attachment(s)</span>
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && messages.length > 0 && (
              <div className="p-4 flex justify-center">
                <Loader2 className="animate-spin text-blue-600" size={24} />
              </div>
            )}
          </div>
        </div>

        {/* Resizer 2 */}
        <div
          className="w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-20 hidden md:block select-none"
          onMouseDown={startResizingList}
        />

        {/* Column 3: Email Detail */}
        <div className={`flex-1 bg-white flex flex-col min-w-0 ${!isMobileDetailView ? 'hidden md:flex' : 'flex'}`}>
          {selectedMessage ? (
            <>
              <div className="md:hidden border-b border-gray-200 p-4">
                <button onClick={() => setIsMobileDetailView(false)} className="flex items-center gap-2 text-gray-600">
                  <ChevronLeft size={20} />
                  <span>Back</span>
                </button>
              </div>

              <div className="border-b border-gray-200 p-6 flex-shrink-0">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">{selectedMessage.subject}</h1>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleStar(selectedMessage.id, selectedMessage.isStarred)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title={selectedMessage.isStarred ? 'Remove star' : 'Add star'}
                    >
                      <Star size={20} className={selectedMessage.isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'} />
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700 flex-shrink-0">
                    {extractName(selectedMessage.from)[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                      <span className="font-medium text-gray-900 truncate">{extractName(selectedMessage.from)}</span>
                      <span className="text-sm text-gray-500">{formatDate(selectedMessage.date)}</span>
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      to: {extractEmail(selectedMessage.to)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  <button
                    onClick={() => handleToggleRead(selectedMessage.id, selectedMessage.isRead)}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    {selectedMessage.isRead ? <MailOpen size={16} /> : <Mail size={16} />}
                    {selectedMessage.isRead ? 'Mark Unread' : 'Mark Read'}
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors whitespace-nowrap">
                    <Reply size={16} /> Reply
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors whitespace-nowrap">
                    <ReplyAll size={16} /> Reply All
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors whitespace-nowrap">
                    <Forward size={16} /> Forward
                  </button>
                  <div className="flex-1"></div>
                  <button
                    onClick={() => handleDeleteEmail(selectedMessage.id)}
                    className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
                {isLoading && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                  </div>
                )}
                <div
                  className="prose prose-sm max-w-none text-gray-800 font-sans"
                  dangerouslySetInnerHTML={{ __html: selectedMessage.body }}
                />

                {selectedMessage.attachments.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Paperclip size={16} />
                      Attachments ({selectedMessage.attachments.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedMessage.attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group cursor-pointer">
                          <div className="w-10 h-10 bg-white rounded border border-gray-200 flex items-center justify-center mr-3 group-hover:text-blue-600">
                            <FileText size={20} className="text-gray-400 group-hover:text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate text-gray-700 group-hover:text-blue-700">{att.filename}</div>
                            <div className="text-xs text-gray-500">{(att.size / 1024).toFixed(1)} KB</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50/50">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <MailOpen size={48} className="text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-600">Select an email to view</p>
              <p className="text-sm text-gray-400 mt-1">Choose an email from the list to read its contents</p>
            </div>
          )}
        </div>
      </div>
    </div >
  );
};

export default EmailDashboard;
