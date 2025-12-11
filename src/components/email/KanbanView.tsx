import React, { useState, useCallback } from 'react';
import { ParsedEmail } from '../../types/gmail';
import { Star, Clock, ExternalLink, GripVertical, Sparkles, CheckCircle2, Inbox as InboxIcon } from 'lucide-react';
import UserAvatar from '../common/UserAvatar';

interface KanbanViewProps {
  messages: ParsedEmail[];
  onMessageClick: (message: ParsedEmail) => void;
  onToggleStar: (id: string, isStarred: boolean) => void;
  onUpdateStatus: (id: string, newStatus: 'inbox' | 'important' | 'done') => void;
}

interface EmailCardProps {
  email: ParsedEmail;
  column: 'inbox' | 'important' | 'done'; // Column identifier for styling
  onSnooze: (email: ParsedEmail) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onMessageClick: (message: ParsedEmail) => void;
}

const EmailCard: React.FC<EmailCardProps> = ({ email, column, onSnooze, onDragStart, onMessageClick }) => {
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

  // Column-based styling
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
      draggable
      onDragStart={(e) => onDragStart(e, email.id)}
      className={`group ${style.bg} ${style.border} border border-slate-200 rounded-md p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-visible cursor-grab active:cursor-grabbing active:rotate-1 active:scale-105 z-10`}
    >

      {/* Visual differentiation now handled by border color and background */}

      {/* Header / Info Section */}
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

        {/* Body */}
        <div className="mb-4 pl-2">
          <h3 className="text-sm font-bold text-slate-900 mb-2 leading-snug">{email.subject}</h3>

          {/* Email Snippet - TODO: Replace with AI Summary field when available */}
          <div className="bg-slate-50 rounded-md p-3 border-l-2 border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
              <Sparkles size={12} /> Preview
            </div>
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
              {email.snippet}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 pl-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSnooze(email);
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-2 py-1.5 rounded-md transition-colors"
          >
            <Clock size={14} /> Snooze
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMessageClick(email);
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-md transition-colors"
            >
              View <ExternalLink size={14} />
            </button>
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
  onSnooze: (email: ParsedEmail) => void;
  onDropEmail: (emailId: string, targetColumn: 'inbox' | 'important' | 'done') => void;
  onMessageClick: (message: ParsedEmail) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>, columnId: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, count, icon: Icon, emails, onSnooze, onDropEmail, onMessageClick, onScroll }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

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
      className={`flex flex-col h-full overflow-hidden min-w-[300px] md:min-w-0 rounded-md border transition-colors duration-200 ${isDraggingOver ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-100' : 'bg-slate-50/50 border-slate-100'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white/50 backdrop-blur-sm flex-shrink-0 rounded-t-md">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-slate-600" />
          <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">{title}</h2>
          <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>
        </div>
      </div>

      {/* Scrollable area with VISIBLE scrollbar - FIXED */}
      <div
        className="p-3 flex-1 overflow-y-auto min-h-0 kanban-column-scroll"
        onScroll={onScroll ? (e) => onScroll(e, id) : undefined}
      >
        {emails.map((email) => (
          <EmailCard
            key={email.id}
            email={email}
            column={id}
            onSnooze={onSnooze}
            onDragStart={handleDragStart}
            onMessageClick={onMessageClick}
          />
        ))}
        {emails.length === 0 && (
          <div className={`h-32 flex flex-col items-center justify-center text-slate-400 text-xs border-2 border-dashed rounded-md transition-colors ${isDraggingOver ? 'border-indigo-300 text-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
            <span>{isDraggingOver ? 'Drop here' : 'No items'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const KanbanView: React.FC<KanbanViewProps> = ({ messages, onMessageClick, onToggleStar, onUpdateStatus }) => {
  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false);

  // SIMPLIFIED KANBAN - Inbox-based workflow
  // TO DO: Unread emails needing attention
  const inboxEmails = messages.filter(e =>
    e.labelIds.includes('INBOX') && e.labelIds.includes('UNREAD') && !e.labelIds.includes('STARRED')
  );

  // IN PROGRESS: Starred emails being worked on
  const importantEmails = messages.filter(e =>
    e.labelIds.includes('STARRED')
  );

  // DONE: Read emails (completed, kept in inbox for reference)
  const doneEmails = messages.filter(e =>
    e.labelIds.includes('INBOX') && !e.labelIds.includes('UNREAD') && !e.labelIds.includes('STARRED')
  );

  const handleSnooze = () => {
    setSnoozeModalOpen(true);
  };

  const handleDropEmail = useCallback((emailId: string, targetColumn: 'inbox' | 'important' | 'done') => {
    const email = messages.find(m => m.id === emailId);
    if (!email) return;

    // Get current column based on new logic
    const currentColumn = email.labelIds.includes('STARRED') ? 'important' :
      (email.labelIds.includes('INBOX') && email.labelIds.includes('UNREAD')) ? 'inbox' : 'done';

    // Don't do anything if dropping in same column
    if (currentColumn === targetColumn) return;

    // GTD workflow actions
    if (targetColumn === 'important') {
      // Moving to ACTION NEEDED: Add star
      if (!email.isStarred) {
        onToggleStar(emailId, false);
      }
    } else if (targetColumn === 'inbox') {
      // Moving back to NEEDS REVIEW: Unstar and mark unread
      if (email.isStarred) {
        onToggleStar(emailId, true);
      }
      onUpdateStatus(emailId, 'inbox'); // Mark as unread
    } else if (targetColumn === 'done') {
      // Moving to ARCHIVED: Remove star and archive (remove INBOX label)
      if (email.isStarred) {
        onToggleStar(emailId, true);
      }
      onUpdateStatus(emailId, 'done'); // Archive email
    }
  }, [messages, onToggleStar, onUpdateStatus]);

  // Infinite scroll handler (for future implementation)
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>, columnId: string) => {
    const element = e.currentTarget;
    const bottom = element.scrollHeight - element.scrollTop === element.clientHeight;

    if (bottom) {
      // TODO: Implement load more for infinite scroll
      console.log(`Load more for ${columnId}`);
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-6 min-w-[900px] md:min-w-0">
          <KanbanColumn
            id="inbox"
            title="To Do"
            count={inboxEmails.length}
            icon={InboxIcon}
            emails={inboxEmails}
            onSnooze={handleSnooze}
            onDropEmail={handleDropEmail}
            onMessageClick={onMessageClick}
            onScroll={handleScroll}
          />
          <KanbanColumn
            id="important"
            title="In Progress"
            count={importantEmails.length}
            icon={Star}
            emails={importantEmails}
            onSnooze={handleSnooze}
            onDropEmail={handleDropEmail}
            onMessageClick={onMessageClick}
            onScroll={handleScroll}
          />
          <KanbanColumn
            id="done"
            title="Done"
            count={doneEmails.length}
            icon={CheckCircle2}
            emails={doneEmails}
            onSnooze={handleSnooze}
            onDropEmail={handleDropEmail}
            onMessageClick={onMessageClick}
            onScroll={handleScroll}
          />
        </div>
      </div>
    </div>
  );
};

export default KanbanView;
