import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchLabels,
  fetchMessages,
  fetchMessage,
  setSelectedLabel,
  setSelectedMessage
} from '../store/slices/gmailSlice';
import { logout } from '../store/slices/authSlice';
import type { GmailLabel, ParsedEmail } from '../types/gmail';
import {
  Inbox, Star, Send, FileText, Trash2, Folder, Search, RefreshCw,
  Mail, MailOpen, Paperclip, Reply, ReplyAll, Forward, LogOut,
  Loader2, ChevronLeft, X
} from 'lucide-react';

const EmailDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { labels, selectedLabel, messages, selectedMessage, isLoading, error } = useAppSelector(state => state.gmail);

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileDetailView, setIsMobileDetailView] = useState(false);

  useEffect(() => {
    dispatch(fetchLabels());
  }, [dispatch]);

  useEffect(() => {
    if (selectedLabel) {
      dispatch(fetchMessages({ labelId: selectedLabel.id }));
    }
  }, [selectedLabel, dispatch]);

  const handleLabelClick = (label: GmailLabel) => {
    dispatch(setSelectedLabel(label));
    setIsMobileDetailView(false);
  };

  const handleMessageClick = (message: ParsedEmail) => {
    dispatch(setSelectedMessage(message));
    dispatch(fetchMessage(message.id));
    setIsMobileDetailView(true);
  };

  const getLabelIcon = (labelId: string) => {
    const icons: Record<string, JSX.Element> = {
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
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

      {/* Main Content - 3 Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Mailboxes (20%) */}
        <aside className={`w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0 ${isMobileDetailView ? 'hidden md:block' : 'block'}`}>
          <div className="p-4">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 font-medium flex items-center justify-center gap-2 transition-colors">
              <Mail size={18} />
              Compose
            </button>
          </div>

          <nav className="px-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
            {isLoading && labels.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-gray-400" size={24} />
              </div>
            ) : (
              labels.map(label => (
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
                    <span className="text-sm">{label.name}</span>
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

        {/* Column 2: Email List (40%) */}
        <div className={`flex-1 bg-white border-r border-gray-200 flex flex-col ${isMobileDetailView ? 'hidden md:flex' : 'flex'}`}>
          <div className="border-b border-gray-200 p-4 flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => selectedLabel && dispatch(fetchMessages({ labelId: selectedLabel.id }))}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Refresh"
              >
                <RefreshCw size={18} className="text-gray-600" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{selectedLabel?.name || 'Select a folder'}</h2>
              <span className="text-sm text-gray-500">{filteredMessages.length} emails</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-gray-400" size={32} />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Mail size={48} className="mb-3" />
                <p>No emails found</p>
              </div>
            ) : (
              filteredMessages.map(message => (
                <div
                  key={message.id}
                  onClick={() => handleMessageClick(message)}
                  className={`border-b border-gray-100 p-4 cursor-pointer transition-colors ${selectedMessage?.id === message.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'
                    } ${!message.isRead ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {message.isStarred && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                      <span className={`text-sm truncate ${!message.isRead ? 'font-semibold' : ''}`}>
                        {extractName(message.from)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">{formatDate(message.date)}</span>
                  </div>

                  <h3 className={`text-sm mb-1 truncate ${!message.isRead ? 'font-semibold' : ''}`}>
                    {message.subject}
                  </h3>

                  <p className="text-xs text-gray-500 truncate">{message.snippet}</p>

                  {message.attachments.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Paperclip size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500">{message.attachments.length} attachment(s)</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Email Detail (40%) */}
        <div className={`flex-1 bg-white flex flex-col ${!isMobileDetailView ? 'hidden md:flex' : 'flex'}`}>
          {selectedMessage ? (
            <>
              <div className="md:hidden border-b border-gray-200 p-4">
                <button onClick={() => setIsMobileDetailView(false)} className="flex items-center gap-2 text-gray-600">
                  <ChevronLeft size={20} />
                  <span>Back</span>
                </button>
              </div>

              <div className="border-b border-gray-200 p-6 flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900 mb-4">{selectedMessage.subject}</h1>

                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700">
                    {extractName(selectedMessage.from)[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{extractName(selectedMessage.from)}</span>
                      <span className="text-sm text-gray-500">{formatDate(selectedMessage.date)}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>to: {extractEmail(selectedMessage.to)}</div>
                      {selectedMessage.cc && <div>cc: {selectedMessage.cc}</div>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    <Reply size={16} />
                    Reply
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                    <ReplyAll size={16} />
                    Reply All
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                    <Forward size={16} />
                    Forward
                  </button>
                  <button className="ml-auto p-2 hover:bg-gray-100 rounded-lg">
                    <Star size={18} className={selectedMessage.isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'} />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Trash2 size={18} className="text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedMessage.body }} />

                {selectedMessage.attachments.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Paperclip size={16} />
                      Attachments ({selectedMessage.attachments.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedMessage.attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                              <Paperclip size={18} className="text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">{att.filename}</div>
                              <div className="text-xs text-gray-500">{(att.size / 1024).toFixed(1)} KB</div>
                            </div>
                          </div>
                          <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MailOpen size={64} className="mb-4" />
              <p className="text-lg font-medium">Select an email to view</p>
              <p className="text-sm">Choose an email from the list to read its contents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailDashboard;
