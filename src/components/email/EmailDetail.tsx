import React from 'react';
import { ParsedEmail, GmailLabel } from '../../types/gmail';
import { gmailService } from '../../services/gmailService';
import { aiService } from '../../services/aiService';
import { ChevronLeft, Star, MailOpen, Mail, Reply, ReplyAll, Forward, Trash2, Loader2, Paperclip, FileText, Download, Sparkles, Inbox, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import ReplyComposer from './ReplyComposer';

import { useAppDispatch, useAppSelector } from '../../store';
import { fetchUserProfiles } from '../../store/slices/gmailSlice';
import UserAvatar from '../common/UserAvatar';

interface EmailDetailProps {
  isMobileDetailView: boolean;
  setIsMobileDetailView: (v: boolean) => void;
  selectedMessage: ParsedEmail | null;
  isLoading: boolean;
  selectedLabel: GmailLabel | null;
  onToggleStar: (id: string, isStarred: boolean) => void;
  onToggleRead: (id: string, isRead: boolean) => void;
  onDelete: (id: string) => void;
  onMoveToInbox?: (id: string) => void;
  onPermanentlyDelete?: (id: string) => void;
  onBack?: () => void; // Optional custom back handler
}

const EmailDetail: React.FC<EmailDetailProps> = ({
  isMobileDetailView,
  setIsMobileDetailView,
  selectedMessage,
  isLoading,
  selectedLabel,
  onToggleStar,
  onToggleRead,
  onDelete,
  onMoveToInbox,
  onPermanentlyDelete,
  onBack
}) => {
  const dispatch = useAppDispatch();
  const { knownUsers } = useAppSelector(state => state.gmail);
  const isInTrash = selectedLabel?.id === 'TRASH';
  const isInSpam = selectedLabel?.id === 'SPAM';
  const isInSent = selectedLabel?.id === 'SENT';
  const isInDraft = selectedLabel?.id === 'DRAFT';
  // Hide star in Trash, Spam, Sent, Draft
  const showStarButton = !isInTrash && !isInSpam && !isInSent && !isInDraft;
  const [showReply, setShowReply] = React.useState(false);
  const [replyAll, setReplyAll] = React.useState(false);

  // AI Summary state
  const [aiSummary, setAiSummary] = React.useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = React.useState(false);
  const [isRegenerating, setIsRegenerating] = React.useState(false);

  // Function to fetch/regenerate summary
  const fetchSummary = React.useCallback(async (regenerate = false) => {
    if (!selectedMessage) return;

    if (regenerate) {
      setIsRegenerating(true);
    } else {
      setIsLoadingSummary(true);
    }

    try {
      const content = selectedMessage.body || selectedMessage.snippet || '';

      const res = regenerate
        ? await aiService.regenerateSummary(selectedMessage.id, content)
        : await aiService.summarizeEmail({
          messageId: selectedMessage.id,
          content,
        });
      setAiSummary(res.summary);
    } catch (err) {
      console.error('Failed to fetch AI summary:', err);
      setAiSummary(null);
    } finally {
      setIsLoadingSummary(false);
      setIsRegenerating(false);
    }
  }, [selectedMessage]);

  // Fetch AI summary when message changes
  React.useEffect(() => {
    if (!selectedMessage) {
      setAiSummary(null);
      return;
    }
    fetchSummary(false);
  }, [selectedMessage?.id]);

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

  // Make all links in email body open in new tab
  const emailBodyRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (emailBodyRef.current) {
      const links = emailBodyRef.current.querySelectorAll('a');
      links.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      });
    }
  }, [selectedMessage?.id, selectedMessage?.body]);

  const [downloadingAttachments, setDownloadingAttachments] = React.useState<Set<string>>(new Set());

  const handleDownload = async (attachmentId: string, filename: string) => {
    if (!selectedMessage) return;

    setDownloadingAttachments(prev => new Set(prev).add(attachmentId));
    try {
      await gmailService.downloadAttachment(selectedMessage.id, attachmentId, filename);
    } catch (error) {
      console.error('Failed to download attachment:', error);
      alert('Failed to download attachment. Please try again.');
    } finally {
      setDownloadingAttachments(prev => {
        const next = new Set(prev);
        next.delete(attachmentId);
        return next;
      });
    }
  };

  const handleReplyClick = (isReplyAll: boolean) => {
    setReplyAll(isReplyAll);
    setShowReply(true);
  };

  const handleReplyClose = () => {
    setShowReply(false);
    setReplyAll(false);
  };

  const { selectedThreadMessages } = useAppSelector(state => state.gmail);

  // Sort messages by date
  const sortedMessages = React.useMemo(() => {
    return [...selectedThreadMessages].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [selectedThreadMessages]);

  const messagesToRender = React.useMemo(() => {
    return sortedMessages.length > 0 ? sortedMessages : (selectedMessage ? [selectedMessage] : []);
  }, [sortedMessages, selectedMessage]);

  console.log('EmailDetail Debug:', {
    selectedMessageId: selectedMessage?.id,
    threadMessagesCount: selectedThreadMessages.length,
    sortedMessagesCount: sortedMessages.length,
    messagesToRenderCount: messagesToRender.length,
    isLoading
  });

  React.useEffect(() => {
    if (messagesToRender.length > 0) {
      const uniqueSenders = Array.from(new Set(messagesToRender.map(msg => {
        const match = msg.from.match(/<(.+)>/);
        return match ? match[1] : msg.from;
      })));

      const unknownEmails = uniqueSenders.filter(email => !knownUsers?.[email]);

      if (unknownEmails.length > 0) {
        dispatch(fetchUserProfiles(unknownEmails));
      }
    }
  }, [messagesToRender, dispatch, knownUsers]);

  if (!selectedMessage) {
    return (
      <div className={`flex-1 bg-white flex flex-col min-w-0 ${!isMobileDetailView ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50/50">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <MailOpen size={48} className="text-gray-300" />
          </div>
          <p className="text-lg font-medium text-gray-600">Select an email to view</p>
          <p className="text-sm text-gray-400 mt-1">Choose an email from the list to read its contents</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 bg-white flex flex-col min-w-0 ${!isMobileDetailView ? 'hidden md:flex' : 'flex'}`}>
      <div className={`border-b border-gray-200 p-4 ${onBack ? 'block' : 'md:hidden'}`}>
        <button
          onClick={() => onBack ? onBack() : setIsMobileDetailView(false)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft size={20} />
          <span>Back</span>
        </button>
      </div>

      <div className="border-b border-gray-200 p-6 flex-shrink-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{selectedMessage.subject}</h1>
          <div className="flex items-center gap-1 flex-shrink-0">
            {showStarButton && (
              <button
                onClick={() => onToggleStar(selectedMessage.id, selectedMessage.isStarred)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title={selectedMessage.isStarred ? 'Remove star' : 'Add star'}
              >
                <Star size={20} className={selectedMessage.isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'} />
              </button>
            )}
          </div>
        </div>

        {/* AI Summary Section */}
        <div className="mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
              {isLoadingSummary || isRegenerating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              AI Summary
            </div>
            <button
              onClick={() => fetchSummary(true)}
              disabled={isLoadingSummary || isRegenerating}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Regenerate summary with your custom prompt"
            >
              <RefreshCw size={14} className={isRegenerating ? 'animate-spin' : ''} />
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {isLoadingSummary
              ? 'Generating summary...'
              : (aiSummary || selectedMessage.snippet || 'No summary available')}
          </p>
        </div>

        {/* Thread Participants Summary (Optional, using first message for now) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {/* Open in Gmail button */}
          <a
            href={`https://mail.google.com/mail/u/0/#inbox/${selectedMessage.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow"
            title="Open in Gmail"
          >
            <ExternalLink size={16} />
            <span className='text-white'>Open in Gmail</span>
          </a>

          {/* Actions for the thread or main message */}
          {(isInTrash || isInSpam) ? (
            <>
              {/* Move to Inbox for Trash/Spam */}
              {onMoveToInbox && (
                <button
                  onClick={() => onMoveToInbox(selectedMessage.id)}
                  className="p-2 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded-lg transition-colors ml-auto"
                  title={isInSpam ? 'Not Spam' : 'Move to Inbox'}
                >
                  <Inbox size={18} />
                </button>
              )}
              {/* Delete Forever */}
              {onPermanentlyDelete && (
                <button
                  onClick={() => onPermanentlyDelete(selectedMessage.id)}
                  className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                  title="Delete Forever"
                >
                  <AlertTriangle size={18} />
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => onDelete(selectedMessage.id)}
              className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors ml-auto"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-scroll custom-scrollbar relative bg-gray-50">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        )}

        <div className="flex flex-col gap-4 p-4">
          {messagesToRender.map((msg) => (
            <div key={msg.id} className={`bg-white rounded-lg border shadow-sm ${msg.id === selectedMessage.id ? 'border-blue-200 ring-1 ring-blue-200' : 'border-gray-200'}`}>
              {/* Message Header */}
              <div className="p-4 border-b border-gray-100 flex items-start gap-3">
                <UserAvatar
                  email={extractEmail(msg.from)}
                  name={extractName(msg.from)}
                  size="w-10 h-10"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                    <span className="font-medium text-gray-900 truncate">{extractName(msg.from)}</span>
                    <span className="text-sm text-gray-500">{formatDate(msg.date)}</span>
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    to: {extractEmail(msg.to)}
                  </div>
                </div>
                {/* Individual Message Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onToggleRead(msg.id, msg.isRead)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                    title={msg.isRead ? "Mark as Unread" : "Mark as Read"}
                  >
                    {msg.isRead ? <MailOpen size={16} /> : <Mail size={16} />}
                  </button>
                </div>
              </div>

              {/* Message Body */}
              <div className="p-6" ref={emailBodyRef}>
                <div
                  className="prose prose-sm max-w-none text-gray-800 font-sans break-words overflow-hidden [&>img]:max-w-full [&>img]:h-auto"
                  dangerouslySetInnerHTML={{ __html: msg.body }}
                />
              </div>

              {/* Attachments */}
              {msg.attachments.length > 0 && (
                <div className="px-6 pb-6 pt-2">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                    <Paperclip size={14} />
                    Attachments ({msg.attachments.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {msg.attachments?.map((att, idx) => (
                      <div key={idx} className="flex items-center p-2 bg-gray-50 rounded border border-gray-200 hover:border-blue-300 transition-all group">
                        <div className="w-8 h-8 bg-white rounded border border-gray-200 flex items-center justify-center mr-3 group-hover:text-blue-600">
                          <FileText size={16} className="text-gray-400 group-hover:text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="font-medium text-xs truncate text-gray-700 group-hover:text-blue-700">{att.filename}</div>
                          <div className="text-[10px] text-gray-500">{(att.size / 1024).toFixed(1)} KB</div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(att.attachmentId, att.filename);
                          }}
                          disabled={downloadingAttachments.has(att.attachmentId)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Download"
                        >
                          {downloadingAttachments.has(att.attachmentId) ? (
                            <Loader2 size={14} className="animate-spin text-blue-600" />
                          ) : (
                            <Download size={14} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions (only for the last message or specific message actions if needed) */}
              <div className="px-4 py-3 bg-gray-50 rounded-b-lg border-t border-gray-100 flex items-center gap-2">
                <button
                  onClick={() => handleReplyClick(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs font-medium transition-colors"
                >
                  <Reply size={14} /> Reply
                </button>
                <button
                  onClick={() => handleReplyClick(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs font-medium transition-colors"
                >
                  <ReplyAll size={14} /> Reply All
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs font-medium transition-colors">
                  <Forward size={14} /> Forward
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reply Composer */}
      {showReply && (
        <ReplyComposer
          messageId={selectedMessage.id} // TODO: This might need to be the ID of the last message or specific message being replied to
          replyTo={selectedMessage.from}
          replyAll={replyAll}
          originalCc={selectedMessage.cc}
          subject={selectedMessage.subject}
          onClose={handleReplyClose}
          onSuccess={handleReplyClose}
        />
      )}
    </div>
  );
};

export default EmailDetail;
