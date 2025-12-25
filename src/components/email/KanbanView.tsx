import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ParsedEmail } from '../../types/gmail';
import { Star, Clock, ExternalLink, GripVertical, Sparkles, CheckCircle2, Inbox as InboxIcon, Loader2, X, Sun, Calendar, ArrowRight, ArrowUpDown, SlidersHorizontal, Mail, Paperclip } from 'lucide-react';
import UserAvatar from '../common/UserAvatar';
import { aiService } from '../../services/aiService';
import SnoozeDatePicker from './SnoozeDatePicker';

// Snooze Modal Component (full-screen overlay like Summary modal)
interface SnoozeModalProps {
  email: ParsedEmail;
  onSnooze: (emailId: string, snoozedUntil: string) => void;
  onCustom: (email: ParsedEmail) => void;
  onClose: () => void;
}

const SnoozeModal: React.FC<SnoozeModalProps> = ({ email, onSnooze, onCustom, onClose }) => {
  const calculateSnoozeDate = (option: string): Date => {
    const now = new Date();
    let snoozeDate = new Date(now);

    switch (option) {
      case 'later-today':
        snoozeDate.setHours(18, 0, 0, 0);
        if (snoozeDate <= now) snoozeDate.setDate(snoozeDate.getDate() + 1);
        break;
      case 'tomorrow':
        snoozeDate.setDate(snoozeDate.getDate() + 1);
        snoozeDate.setHours(9, 0, 0, 0);
        break;
      case 'weekend':
        const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
        snoozeDate.setDate(snoozeDate.getDate() + daysUntilSaturday);
        snoozeDate.setHours(9, 0, 0, 0);
        break;
      case 'next-week':
        const daysUntilMonday = (1 - now.getDay() + 7) % 7 || 7;
        snoozeDate.setDate(snoozeDate.getDate() + daysUntilMonday);
        snoozeDate.setHours(9, 0, 0, 0);
        break;
    }
    return snoozeDate;
  };

  const handleOption = (option: string) => {
    if (option === 'custom') {
      onCustom(email);
    } else {
      const snoozeDate = calculateSnoozeDate(option);
      onSnooze(email.id, snoozeDate.toISOString());
    }
    onClose();
  };

  const extractName = (emailString: string) => {
    const match = emailString.match(/^"?([^"<]+)"?\s*</);
    return match ? match[1].trim() : emailString.split('@')[0];
  };

  const options = [
    { id: 'later-today', label: 'Later Today', icon: Sun, desc: '6:00 PM' },
    { id: 'tomorrow', label: 'Tomorrow', icon: ArrowRight, desc: '9:00 AM' },
    { id: 'weekend', label: 'This Weekend', icon: Calendar, desc: 'Saturday 9:00 AM' },
    { id: 'next-week', label: 'Next Week', icon: Calendar, desc: 'Monday 9:00 AM' },
    { id: 'custom', label: 'Pick Date & Time', icon: Calendar, desc: '' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-800 p-4 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={18} />
                <span className="font-semibold">Snooze Email</span>
              </div>
              <p className="text-sm text-slate-300 truncate">
                {email.subject || '(No Subject)'} • {extractName(email.from)}
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

        {/* Options */}
        <div className="p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Snooze until</div>
          <div className="space-y-1">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleOption(opt.id)}
                className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-100 rounded-lg transition-colors text-left"
              >
                <opt.icon size={20} className="text-slate-600" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{opt.label}</div>
                  {opt.desc && <div className="text-sm text-gray-500">{opt.desc}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Summary Modal Component
interface SummaryModalProps {
  email: ParsedEmail | null;
  summary: string;
  onClose: () => void;
  onView: (email: ParsedEmail) => void;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ email, summary, onClose, onView: _onView }) => {
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

interface KanbanViewProps {
  messages: ParsedEmail[];
  kanbanStatuses: Record<string, string>;
  onMessageClick: (message: ParsedEmail) => void;
  onToggleStar: (id: string, isStarred: boolean) => void;
  onUpdateStatus: (id: string, newStatus: 'inbox' | 'important' | 'done') => void;
  onSnooze?: (emailId: string, snoozedUntil: string) => void;
}

interface EmailCardProps {
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

const EmailCard: React.FC<EmailCardProps> = ({
  email,
  column,
  summaryText,
  isLoadingSummary,
  onSnooze,
  onDragStart,
  onMessageClick: _onMessageClick,
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

interface KanbanColumnProps {
  id: 'inbox' | 'important' | 'done';
  title: string;
  count: number;
  icon: React.ElementType;
  emails: ParsedEmail[];
  summariesById: Record<string, string>;
  loadingIds: Set<string>;
  onSnooze: (email: ParsedEmail) => void;
  onDropEmail: (emailId: string, targetColumn: 'inbox' | 'important' | 'done') => void;
  onMessageClick: (message: ParsedEmail) => void;
  onCardVisible: (emailId: string) => void;
  onShowSummaryModal: (email: ParsedEmail) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>, columnId: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id, title, count, icon: Icon, emails, summariesById, loadingIds,
  onSnooze, onDropEmail, onMessageClick, onCardVisible, onShowSummaryModal, onScroll
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Column-specific sort/filter state
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterAttachments, setFilterAttachments] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply filters and sorting
  const filteredAndSortedEmails = React.useMemo(() => {
    let result = [...emails];

    // Apply filters
    if (filterUnread) {
      result = result.filter(e => !e.isRead);
    }
    if (filterAttachments) {
      result = result.filter(e => e.attachments && e.attachments.length > 0);
    }

    // Apply sorting
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [emails, filterUnread, filterAttachments, sortOrder]);

  const hasActiveFilter = filterUnread || filterAttachments;
  const activeFilterCount = (filterUnread ? 1 : 0) + (filterAttachments ? 1 : 0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const emailId = e.dataTransfer.getData("emailId");
    if (emailId) {
      onDropEmail(emailId, id);
    }
  };

  const handleDragStart = (e: React.DragEvent, emailId: string) => {
    e.dataTransfer.setData("emailId", emailId);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className={`flex flex-col h-full w-full rounded-md border transition-colors duration-200 ${isDraggingOver ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-100' : 'bg-slate-50/50 border-slate-100'}`}
      style={{ zIndex: showDropdown ? 50 : 0, position: 'relative' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-3 flex items-center justify-between border-b border-slate-100 bg-white/50 backdrop-blur-sm flex-shrink-0 rounded-t-md relative z-20">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-slate-600" />
          <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">{title}</h2>
          <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {hasActiveFilter ? `${filteredAndSortedEmails.length}/${count}` : count}
          </span>
        </div>

        {/* Sort/Filter Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`p-1.5 rounded-md transition-colors ${hasActiveFilter || sortOrder !== 'newest'
              ? 'bg-indigo-100 text-indigo-700'
              : 'hover:bg-slate-100 text-slate-500'
              }`}
            title="Sort & Filter"
          >
            <SlidersHorizontal size={14} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute top-full right-0 mt-1 w-52 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden">
              {/* Sort Section */}
              <div className="p-2 border-b border-slate-100">
                <div className="text-xs font-semibold text-slate-500 uppercase mb-2 px-2">Sort by</div>
                <button
                  onClick={() => setSortOrder('newest')}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${sortOrder === 'newest' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  Newest first
                </button>
                <button
                  onClick={() => setSortOrder('oldest')}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${sortOrder === 'oldest' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  Oldest first
                </button>
              </div>

              {/* Filter Section */}
              <div className="p-2">
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Filter</span>
                  {hasActiveFilter && (
                    <button
                      onClick={() => {
                        setFilterUnread(false);
                        setFilterAttachments(false);
                      }}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterUnread}
                    onChange={(e) => setFilterUnread(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded"
                  />
                  <Mail size={14} className="text-slate-500" />
                  <span className="text-sm text-slate-700">Unread</span>
                </label>
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterAttachments}
                    onChange={(e) => setFilterAttachments(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded"
                  />
                  <Paperclip size={14} className="text-slate-500" />
                  <span className="text-sm text-slate-700">Attachments</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="p-3 flex-1 overflow-y-auto overflow-x-hidden min-h-0 kanban-column-scroll rounded-b-md"
        onScroll={onScroll ? (e) => onScroll(e, id) : undefined}
      >
        {filteredAndSortedEmails.map((email) => (
          <EmailCard
            key={email.id}
            email={email}
            column={id}
            summaryText={summariesById[email.id]}
            isLoadingSummary={loadingIds.has(email.id)}
            onSnooze={onSnooze}
            onDragStart={handleDragStart}
            onMessageClick={onMessageClick}
            onVisible={onCardVisible}
            onShowSummaryModal={onShowSummaryModal}
          />
        ))}
        {filteredAndSortedEmails.length === 0 && (
          <div className={`min-h-[200px] h-full flex flex-col items-center justify-center text-slate-400 text-xs border-2 border-dashed rounded-md transition-colors ${isDraggingOver ? 'border-indigo-300 text-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
            <span>{isDraggingOver ? 'Drop here' : hasActiveFilter ? 'No matching items' : 'No items'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const KanbanView: React.FC<KanbanViewProps> = ({ messages, kanbanStatuses, onMessageClick, onUpdateStatus, onSnooze }) => {
  const [summariesById, setSummariesById] = useState<Record<string, string>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set()); // Track failed requests
  const pendingRef = useRef<Set<string>>(new Set());

  // Modal state
  const [modalEmail, setModalEmail] = useState<ParsedEmail | null>(null);

  // Snooze state
  const [snoozeDropdownEmail, setSnoozeDropdownEmail] = useState<ParsedEmail | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customSnoozeEmail, setCustomSnoozeEmail] = useState<ParsedEmail | null>(null);

  const handleShowSummaryModal = useCallback((email: ParsedEmail) => {
    setModalEmail(email);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalEmail(null);
  }, []);

  const buildCardContent = useCallback((email: ParsedEmail) => {
    const parts = [
      email.subject ? `Subject: ${email.subject}` : '',
      email.from ? `From: ${email.from}` : '',
      email.snippet ? `Snippet: ${email.snippet}` : '',
    ].filter(Boolean);
    return parts.join('\n');
  }, []);

  // Handle card becoming visible - request summary
  const handleCardVisible = useCallback(async (emailId: string) => {
    // Skip if already have summary, already loading, already pending, or previously failed
    if (summariesById[emailId] || loadingIds.has(emailId) || pendingRef.current.has(emailId) || failedIds.has(emailId)) {
      return;
    }

    const email = messages.find(m => m.id === emailId);
    if (!email || (!email.snippet && !email.subject)) return;

    pendingRef.current.add(emailId);
    setLoadingIds(prev => new Set([...prev, emailId]));

    try {
      const res = await aiService.summarizeEmail({
        messageId: email.id,
        content: buildCardContent(email),
      });
      setSummariesById(prev => ({ ...prev, [email.id]: res.summary }));
    } catch (err) {
      console.error('Failed to get summary for', emailId, err);
      // Mark as failed to prevent infinite retries
      setFailedIds(prev => new Set([...prev, emailId]));
    } finally {
      pendingRef.current.delete(emailId);
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(emailId);
        return next;
      });
    }
  }, [messages, summariesById, loadingIds, failedIds, buildCardContent]);

  // Filter messages based on Backend Status (sorting/filtering now handled per-column)
  const inboxEmails = messages.filter(e => {
    const status = kanbanStatuses[e.id];
    return !status || status === 'INBOX';
  });

  const importantEmails = messages.filter(e =>
    kanbanStatuses[e.id] === 'IN_PROGRESS'
  );

  const doneEmails = messages.filter(e =>
    kanbanStatuses[e.id] === 'DONE'
  );

  const handleSnooze = useCallback((email: ParsedEmail) => {
    setSnoozeDropdownEmail(email);
  }, []);

  const handleSnoozeConfirm = useCallback((emailId: string, snoozedUntil: string) => {
    if (onSnooze) {
      onSnooze(emailId, snoozedUntil);
    }
    setSnoozeDropdownEmail(null);
  }, [onSnooze]);

  const handleCustomSnooze = useCallback((email: ParsedEmail) => {
    setCustomSnoozeEmail(email);
    setShowDatePicker(true);
    setSnoozeDropdownEmail(null);
  }, []);

  const handleDropEmail = useCallback((emailId: string, targetColumn: 'inbox' | 'important' | 'done') => {
    const email = messages.find(m => m.id === emailId);
    if (!email) return;

    if (targetColumn === 'important') {
      onUpdateStatus(emailId, 'important');
    } else if (targetColumn === 'inbox') {
      onUpdateStatus(emailId, 'inbox');
    } else if (targetColumn === 'done') {
      onUpdateStatus(emailId, 'done');
    }
  }, [messages, onUpdateStatus]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>, columnId: string) => {
    const element = e.currentTarget;
    const bottom = element.scrollHeight - element.scrollTop === element.clientHeight;

    if (bottom) {
      console.log(`Load more for ${columnId}`);
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-white">


      <div className="flex-1 p-6 w-full min-h-0">
        <div className="h-full w-full grid gap-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <KanbanColumn
            id="inbox"
            title="Inbox"
            count={inboxEmails.length}
            icon={InboxIcon}
            emails={inboxEmails}
            summariesById={summariesById}
            loadingIds={loadingIds}
            onSnooze={handleSnooze}
            onDropEmail={handleDropEmail}
            onMessageClick={onMessageClick}
            onCardVisible={handleCardVisible}
            onShowSummaryModal={handleShowSummaryModal}
            onScroll={handleScroll}
          />
          <KanbanColumn
            id="important"
            title="In Progress"
            count={importantEmails.length}
            icon={Star}
            emails={importantEmails}
            summariesById={summariesById}
            loadingIds={loadingIds}
            onSnooze={handleSnooze}
            onDropEmail={handleDropEmail}
            onMessageClick={onMessageClick}
            onCardVisible={handleCardVisible}
            onShowSummaryModal={handleShowSummaryModal}
            onScroll={handleScroll}
          />
          <KanbanColumn
            id="done"
            title="Done"
            count={doneEmails.length}
            icon={CheckCircle2}
            emails={doneEmails}
            summariesById={summariesById}
            loadingIds={loadingIds}
            onSnooze={handleSnooze}
            onDropEmail={handleDropEmail}
            onMessageClick={onMessageClick}
            onCardVisible={handleCardVisible}
            onShowSummaryModal={handleShowSummaryModal}
            onScroll={handleScroll}
          />
        </div>
      </div>

      {/* Summary Modal */}
      {modalEmail && (
        <SummaryModal
          email={modalEmail}
          summary={summariesById[modalEmail.id] || ''}
          onClose={handleCloseModal}
          onView={onMessageClick}
        />
      )}

      {/* Snooze Modal */}
      {snoozeDropdownEmail && (
        <SnoozeModal
          email={snoozeDropdownEmail}
          onSnooze={handleSnoozeConfirm}
          onCustom={handleCustomSnooze}
          onClose={() => setSnoozeDropdownEmail(null)}
        />
      )}

      {/* Snooze Date Picker Modal */}
      {showDatePicker && customSnoozeEmail && (
        <SnoozeDatePicker
          onConfirm={(dateTime) => {
            if (onSnooze) {
              onSnooze(customSnoozeEmail.id, dateTime);
            }
            setShowDatePicker(false);
            setCustomSnoozeEmail(null);
          }}
          onClose={() => {
            setShowDatePicker(false);
            setCustomSnoozeEmail(null);
          }}
        />
      )}
    </div>
  );
};

export default KanbanView;
