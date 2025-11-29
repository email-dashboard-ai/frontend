import React from 'react';
import { ParsedEmail, GmailLabel } from '../../types/gmail';
import { Search, RefreshCw, Mail, Loader2, Star, Trash2, Paperclip } from 'lucide-react';

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
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  listRef: React.RefObject<HTMLDivElement | null>;
  onToggleStar: (id: string, isStarred: boolean) => void;
  onDelete: (id: string) => void;
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
  onScroll,
  listRef,
  onToggleStar,
  onDelete
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

  return (
    <div
      ref={listRef}
      className={`bg-white border-r border-gray-200 flex flex-col flex-shrink-0 ${isMobileDetailView ? 'hidden md:flex' : 'flex'} w-full md:w-[var(--list-width)]`}
      style={{ '--list-width': `${listWidth}px` } as React.CSSProperties}
    >
      <div className="border-b border-gray-200 p-4 flex-shrink-0 bg-white z-10 h-[110px] flex flex-col justify-between">
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
      </div>

      <div
        className="flex-1 overflow-y-auto custom-scrollbar select-none"
        onScroll={onScroll}
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
              className={`border-b border-gray-100 p-4 transition-colors duration-200 group ${selectedMessage?.id === message.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                } ${!message.isRead ? 'bg-white' : 'bg-gray-50/50'}`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
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
                  {!isInTrash && (
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
          ))
        )}
        {isLoading && messages.length > 0 && (
          <div className="p-4 flex justify-center">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailList;
