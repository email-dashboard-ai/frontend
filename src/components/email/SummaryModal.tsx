import React from 'react';
import { ParsedEmail } from '../../types/gmail';
import { Sparkles, ExternalLink, X } from 'lucide-react';

interface SummaryModalProps {
  email: ParsedEmail | null; // Allow null for safer typing
  summary: string;
  onClose: () => void;
  onView: () => void;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ email, summary, onClose }) => {
  if (!email) return null;

  const extractName = (emailString: string) => {
    const match = emailString.match(/^"?([^"<]+)"?\s*</);
    return match ? match[1].trim() : emailString.split('@')[0];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-800 p-4 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold">{email.subject}</h2>
              <p className="text-sm text-slate-300 mt-1">
                From: {extractName(email.from)} • {formatDate(email.date)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors ml-4"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* AI Summary Content */}
        <div className="p-6">
          <div className="flex items-center gap-2 text-slate-700 font-semibold mb-4">
            <Sparkles size={20} />
            <span>AI Summary</span>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {summary || email.snippet || 'No summary available'}
            </p>
          </div>
        </div>

        {/* Footer with View button */}
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Close
          </button>
          <a
            href={`https://mail.google.com/mail/u/0/#inbox/${email.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <ExternalLink size={16} />
            View Full Email
          </a>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
