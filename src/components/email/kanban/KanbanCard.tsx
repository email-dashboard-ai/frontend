import React, { useRef, useEffect } from 'react';
import { ParsedEmail } from '../../../types/gmail';
import { Star, Clock, ExternalLink, GripVertical, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import UserAvatar from '../../common/UserAvatar';

interface KanbanCardProps {
  email: ParsedEmail;
  column: 'inbox' | 'important' | 'done';
  summaryText?: string;
  isLoadingSummary?: boolean;
  onSnooze: (email: ParsedEmail) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onMessageClick: (message: ParsedEmail) => void;
  onVisible?: (emailId: string) => void;
  onShowSummaryModal?: (email: ParsedEmail) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  email,
  column,
  summaryText,
  isLoadingSummary,
  onSnooze,
  onDragStart,
  onMessageClick,
  onVisible,
  onShowSummaryModal,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!onVisible || summaryText) return; // Skip if already have summary

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onVisible(email.id);
            observer.disconnect(); // Only trigger once
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px' } // Trigger slightly before visible
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [email.id, onVisible, summaryText]);

  const extractEmail = (emailString: string) => {
    const match = emailString.match(/<(.+)>/);
    return match ? match[1] : emailString;
  };

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

  const columnStyles = {
    inbox: {
      border: 'border-l-4 border-l-blue-500',
      bg: 'bg-white',
      indicator: '🔵'
    },
    important: {
      border: 'border-l-4 border-l-yellow-500',
      bg: 'bg-yellow-50',
      indicator: '⭐'
    },
    done: {
      border: 'border-l-4 border-l-green-500',
      bg: 'bg-gray-50',
      indicator: '✅'
    }
  };

  const style = columnStyles[column];

  return (
    <div
      ref={cardRef}
      draggable
      onClick={() => {
        if (onMessageClick) onMessageClick(email);
      }}
      onDragStart={(e) => onDragStart(e, email.id)}
      className={`group ${style.bg} ${style.border} border border-slate-200 rounded-md p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-visible cursor-grab active:cursor-grabbing active:rotate-1 active:scale-105 z-10`}
    >
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3 pl-2">
          <div className="flex items-center gap-3">
            <UserAvatar
              email={extractEmail(email.from)}
              name={extractName(email.from)}
              size="w-8 h-8"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900 leading-tight">{extractName(email.from)}</span>
              <span className="text-xs text-slate-500">{formatDate(email.date)}</span>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-800 cursor-grab">
            <GripVertical size={16} />
          </button>
        </div>

        <div className="mb-4 pl-2">
          <h3 className="text-sm font-bold text-slate-900 mb-2 leading-snug">{email.subject}</h3>

          {/* AI Summary with loading state - Clickable to show modal */}
          <div
            className="bg-slate-50 rounded-md p-3 border-l-2 border-slate-800 cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (onShowSummaryModal) onShowSummaryModal(email);
            }}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
              {isLoadingSummary ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              AI Summary
              <span className="text-slate-400 font-normal ml-auto">Click to expand</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
              {isLoadingSummary ? 'Generating summary...' : (summaryText || email.snippet)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3 pl-2">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSnooze(email);
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-2 py-1.5 rounded-md transition-colors"
            >
              <Clock size={14} /> Snooze
            </button>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://mail.google.com/mail/u/0/#inbox/${email.id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-md transition-colors"
            >
              View <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KanbanCard;
