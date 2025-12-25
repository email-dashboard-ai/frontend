import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ParsedEmail } from '../../../types/gmail';
import { SlidersHorizontal, Mail, Paperclip } from 'lucide-react';
import KanbanCard from './KanbanCard';

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

  // Calculate dropdown position
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (showDropdown && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 5,
        left: rect.right - 208, // 208px is dropdown width (w-52)
      });
    }
  }, [showDropdown]);

  // Handle scroll to close dropdown
  useEffect(() => {
    const handleScroll = () => {
      if (showDropdown) setShowDropdown(false);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [showDropdown]);

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
      className={`flex flex-col h-full w-full overflow-hidden rounded-md border transition-colors duration-200 ${isDraggingOver ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-100' : 'bg-slate-50/50 border-slate-100'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-3 flex items-center justify-between border-b border-slate-100 bg-white/50 backdrop-blur-sm flex-shrink-0 rounded-t-md">
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

          {showDropdown && createPortal(
            <div
              className="fixed bg-white rounded-lg shadow-xl border border-slate-200 z-[9999] overflow-hidden w-52"
              style={{ top: dropdownPos.top, left: dropdownPos.left }}
              onMouseDown={(e) => e.stopPropagation()}
            >
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
            </div>,
            document.body
          )}
        </div>
      </div>

      <div
        className="p-3 flex-1 overflow-y-auto overflow-x-hidden min-h-0 kanban-column-scroll rounded-b-md"
        onScroll={onScroll ? (e) => onScroll(e, id) : undefined}
      >
        {filteredAndSortedEmails.map((email) => (
          <KanbanCard
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
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center border-2 border-dashed border-slate-100 rounded-lg">
            {hasActiveFilter ? (
              <>
                <p className="text-sm font-medium">No matching items</p>
                <p className="text-xs mt-1 text-slate-400">Try clearing filters</p>
              </>
            ) : (
              <p className="text-sm font-medium">No items</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
