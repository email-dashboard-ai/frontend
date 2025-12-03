import React from 'react';
import { ParsedEmail, GmailLabel } from '../../types/gmail';
import { Search, RefreshCw, Mail, Loader2, Star, Trash2, Paperclip, Square, CheckSquare, MailOpen, MinusSquare } from 'lucide-react';

interface EmailListProps {
  listWidth: number;
  isMobileDetailView: boolean;
  messages: ParsedEmail[];
  selectedMessage: ParsedEmail | null;
  selectedLabel: GmailLabel | null;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onRefresh: () => void;
  onMessageClick: (message: ParsedEmail) => void;
  listRef: React.RefObject<HTMLDivElement | null>;
  onToggleStar: (id: string, isStarred: boolean) => void;
  onDelete: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkMarkRead: (ids: string[], isRead: boolean) => void;
  onClearSelection: () => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const EmailList: React.FC<EmailListProps> = ({
  listWidth,
  isMobileDetailView,
  messages,
  selectedMessage,
  selectedLabel,
  isLoading,
  searchQuery,
  setSearchQuery,
  onRefresh,
  onMessageClick,
  listRef,
  onToggleStar,
  onDelete,
  selectedIds,
  onToggleSelection,
  onBulkDelete,
  onBulkMarkRead,
  onClearSelection,
  onNextPage,
  onPrevPage,
  hasNextPage,
  hasPrevPage
}) => {
  const isInTrash = selectedLabel?.id === 'TRASH';

  const extractName = (emailString: string) => {
    const match = emailString.match(/^"?([^"<]+)"?\s*</);
    return match ? match[1].trim() : emailString.split('@')[0];
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

  const filteredMessages = messages.filter(msg =>
    msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Determine bulk action state based on the first selected item
  const firstSelectedMessage = filteredMessages.find(msg => selectedIds.has(msg.id));
  const isFirstSelectedRead = firstSelectedMessage?.isRead ?? false;

  return (
    <div
      ref={listRef}
      className={`bg-white border-r border-gray-200 flex flex-col flex-shrink-0 ${isMobileDetailView ? 'hidden md:flex' : 'flex'} w-full md:w-[var(--list-width)]`}
      style={{ '--list-width': `${listWidth}px` } as React.CSSProperties}
    >
      <div className="border-b border-gray-200 p-4 flex-shrink-0 bg-white z-10 h-[110px] flex flex-col justify-between">
        {selectedIds.size > 0 ? (
          // Bulk Action Toolbar
          <div className="flex flex-col h-full justify-center gap-3">
            <div className="flex items-center justify-between bg-blue-50 p-2 rounded-lg border border-blue-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClearSelection}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  title="Clear selection"
                >
                  <MinusSquare size={20} />
                </button>
                <span className="font-semibold text-blue-900 text-sm">{selectedIds.size} selected</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onBulkMarkRead(Array.from(selectedIds), !isFirstSelectedRead)}
                  className="p-2 hover:bg-blue-100 rounded text-blue-700 transition-colors"
                  title={isFirstSelectedRead ? 'Mark as Unread' : 'Mark as Read'}
                >
                  {isFirstSelectedRead ? <Mail size={18} /> : <MailOpen size={18} />}
                </button>
                {!isInTrash && (
                  <button
                    onClick={() => onBulkDelete(Array.from(selectedIds))}
                    className="p-2 hover:bg-red-100 rounded text-red-600 transition-colors"
                    title="Delete selected"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500 text-center">
              Select more or perform action
            </div>
          </div>
        ) : (
          // Standard Search Toolbar
          <>
            <div className="flex items-center gap-2">
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
                onClick={onRefresh}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw size={18} className="text-gray-600" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 truncate pr-2">{selectedLabel?.name || 'Select a folder'}</h2>
              <span className="text-xs text-gray-500 whitespace-nowrap">{filteredMessages.length} emails</span>
            </div>
          </>
        )}
      </div>

      <div
        className="flex-1 overflow-y-auto custom-scrollbar select-none"
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
          <>
            {filteredMessages?.map(message => (
              <div
                key={message.id}
                className={`border-b border-gray-100 p-4 transition-colors duration-200 group ${selectedMessage?.id === message.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                  } ${!message.isRead ? 'bg-white' : 'bg-gray-50/50'} ${selectedIds.has(message.id) ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelection(message.id);
                      }}
                      className="p-1 hover:bg-gray-200 rounded flex-shrink-0 text-gray-400 hover:text-gray-600"
                    >
                      {selectedIds.has(message.id) ? (
                        <CheckSquare size={18} className="text-blue-600" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(message.id, message.isStarred);
                      }}
                      className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                      title={message.isStarred ? 'Remove star' : 'Add star'}
                    >
                      <Star size={16} className={message.isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'} />
                    </button>
                    <span
                      className={`text-sm truncate cursor-pointer ${!message.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                      onClick={() => onMessageClick(message)}
                    >
                      {extractName(message.from)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs mr-2 flex-shrink-0 ${!message.isRead ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                      {formatDate(message.date)}
                    </span>
                    {!isInTrash && selectedIds.size === 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(message.id);
                        }}
                        className="p-1.5 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete"
                      >
                        <Trash2 size={16} className="text-gray-400 hover:text-red-600" />
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className={`text-sm mb-1 truncate cursor-pointer ${!message.isRead ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                  onClick={() => onMessageClick(message)}
                >
                  {message.subject || '(No Subject)'}
                </div>

                <p className="text-xs text-gray-500 truncate line-clamp-1">{message.snippet}</p>

                {message.attachments.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Paperclip size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500">{message.attachments.length} attachment(s)</span>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination Controls */}
            <div className="p-4 flex items-center justify-between border-t border-gray-200 bg-gray-50">
              <button
                onClick={onPrevPage}
                disabled={!hasPrevPage || isLoading}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${!hasPrevPage || isLoading
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-200 bg-white border border-gray-300'
                  }`}
              >
                Previous
              </button>
              <button
                onClick={onNextPage}
                disabled={!hasNextPage || isLoading}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${!hasNextPage || isLoading
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-200 bg-white border border-gray-300'
                  }`}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailList;
