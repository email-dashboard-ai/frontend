import React from 'react';
import { GmailLabel } from '../../types/gmail';
import { Inbox, Star, Send, FileText, Trash2, Folder, Loader2, Edit2 } from 'lucide-react';

interface EmailSidebarProps {
  sidebarWidth: number;
  isMobileDetailView: boolean;
  labels: GmailLabel[];
  selectedLabel: GmailLabel | null;
  isLoading: boolean;
  onLabelClick: (label: GmailLabel) => void;
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  onCompose: () => void;
}

const EmailSidebar: React.FC<EmailSidebarProps> = ({
  sidebarWidth,
  isMobileDetailView,
  labels,
  selectedLabel,
  isLoading,
  onLabelClick,
  sidebarRef,
  onCompose
}) => {
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

  return (
    <aside
      ref={sidebarRef}
      className={`bg-white border-r border-gray-200 flex-shrink-0 flex flex-col ${isMobileDetailView ? 'hidden md:flex' : 'flex'} w-full md:w-[var(--sidebar-width)]`}
      style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
    >
      <div className="p-4 pb-2">
        <button
          onClick={onCompose}
          className="flex items-center gap-3 px-6 py-4 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-2xl transition-colors shadow-sm hover:shadow-md w-fit"
        >
          <Edit2 size={24} />
          <span className="font-medium text-base">Compose</span>
        </button>
      </div>
      <nav className="px-2 py-2 flex-1 overflow-y-auto custom-scrollbar select-none">
        {isLoading && labels.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : (
          visibleLabels.map(label => (
            <button
              key={label.id}
              onClick={() => onLabelClick(label)}
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
  );
};

export default EmailSidebar;
