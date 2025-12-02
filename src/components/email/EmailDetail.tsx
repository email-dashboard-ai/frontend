import React from 'react';
import { ParsedEmail, GmailLabel } from '../../types/gmail';
import { gmailService } from '../../services/gmailService';
import { ChevronLeft, Star, MailOpen, Mail, Reply, ReplyAll, Forward, Trash2, Loader2, Paperclip, FileText, Download } from 'lucide-react';
import ReplyComposer from './ReplyComposer';

interface EmailDetailProps {
  isMobileDetailView: boolean;
  setIsMobileDetailView: (v: boolean) => void;
  selectedMessage: ParsedEmail | null;
  isLoading: boolean;
  selectedLabel: GmailLabel | null;
  onToggleStar: (id: string, isStarred: boolean) => void;
  onToggleRead: (id: string, isRead: boolean) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}

const EmailDetail: React.FC<EmailDetailProps> = ({
  isMobileDetailView,
  setIsMobileDetailView,
  selectedMessage,
  isLoading,
  selectedLabel,
  onToggleStar,
  onToggleRead,
  onDelete
}) => {
  const isInTrash = selectedLabel?.id === 'TRASH';
  const [showReply, setShowReply] = React.useState(false);
  const [replyAll, setReplyAll] = React.useState(false);

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


  return (
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
                  onClick={() => onToggleStar(selectedMessage.id, selectedMessage.isStarred)}
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
                onClick={() => onToggleRead(selectedMessage.id, selectedMessage.isRead)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors whitespace-nowrap"
              >
                {selectedMessage.isRead ? <MailOpen size={16} /> : <Mail size={16} />}
                {selectedMessage.isRead ? 'Mark Unread' : 'Mark Read'}
              </button>
              <button
                onClick={() => handleReplyClick(false)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors whitespace-nowrap"
              >
                <Reply size={16} /> Reply
              </button>
              <button
                onClick={() => handleReplyClick(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors whitespace-nowrap"
              >
                <ReplyAll size={16} /> Reply All
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors whitespace-nowrap">
                <Forward size={16} /> Forward
              </button>
              <div className="flex-1"></div>
              {!isInTrash && (
                <button
                  onClick={() => onDelete(selectedMessage.id)}
                  className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              )}
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
                    <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group">
                      <div className="w-10 h-10 bg-white rounded border border-gray-200 flex items-center justify-center mr-3 group-hover:text-blue-600">
                        <FileText size={20} className="text-gray-400 group-hover:text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="font-medium text-sm truncate text-gray-700 group-hover:text-blue-700">{att.filename}</div>
                        <div className="text-xs text-gray-500">{(att.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(att.attachmentId, att.filename);
                        }}
                        disabled={downloadingAttachments.has(att.attachmentId)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download"
                      >
                        {downloadingAttachments.has(att.attachmentId) ? (
                          <Loader2 size={18} className="animate-spin text-blue-600" />
                        ) : (
                          <Download size={18} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reply Composer */}
          {showReply && selectedMessage && (
            <ReplyComposer
              messageId={selectedMessage.id}
              replyTo={selectedMessage.from}
              replyAll={replyAll}
              originalCc={selectedMessage.cc}
              subject={selectedMessage.subject}
              onClose={handleReplyClose}
              onSuccess={handleReplyClose}
            />
          )}
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
  );
};

export default EmailDetail;
