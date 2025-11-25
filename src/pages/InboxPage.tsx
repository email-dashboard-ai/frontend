import React, { useState, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  fetchEmails,
  setCurrentView,
  setSearchQuery,
  moveEmailToColumn,
  reorderEmailsInColumn,
  openSnoozeModal,
  closeSnoozeModal,
  clearError
} from '../store/slices/emailSlice';
import { logout } from '../store/slices/authSlice';
import type { Email } from '../types';

// Import icons from Lucide React
import { 
  Search, 
  MoreHorizontal, 
  Clock, 
  ExternalLink, 
  GripVertical, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  Inbox,
  LogOut,
  Calendar,
  Sun,
  Moon,
  ChevronRight,
  ArrowLeft,
  Filter,
  ChevronDown
} from 'lucide-react';

// Components
const EmailCard: React.FC<{
  email: Email;
  onSnooze: (email: Email) => void;
  isSearchResult?: boolean;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onStatusChange?: (emailId: string, newColumn: Email['column']) => void;
  onDragOver?: (emailId: string) => void;
  onDragLeave?: () => void;
  isDraggedOver?: boolean;
}> = ({ 
  email, 
  onSnooze, 
  isSearchResult = false, 
  onDragStart, 
  onStatusChange, 
  onDragOver,
  onDragLeave,
  isDraggedOver = false 
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver?.(email.id);
  };

  const handleDragLeave = () => {
    onDragLeave?.();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDragLeave?.();
  };

  return (
    <div 
      draggable={!isSearchResult}
      onDragStart={(e) => onDragStart && onDragStart(e, email.id)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 relative ${
        isSearchResult 
          ? 'flex flex-col md:flex-row md:items-start md:gap-4' 
          : `cursor-grab active:cursor-grabbing hover:scale-[1.02] mb-3 ${
              isDraggedOver 
                ? 'border-blue-300 shadow-lg ring-2 ring-blue-100 transform scale-105' 
                : ''
            }`
      }`}
    >
      {/* Priority indicator */}
      {email.priority === 'high' && (
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-lg" />
      )}
      
      <div className={`flex-1 ${isSearchResult ? 'w-full' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pl-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-700 border border-slate-200 shrink-0">
              {email.avatar}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900 leading-tight">
                {email.sender}
              </span>
              <span className="text-xs text-slate-500">{email.time}</span>
            </div>
          </div>
          {!isSearchResult && (
            <button className="text-slate-400 hover:text-slate-800 cursor-grab">
              <GripVertical size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="mb-4 pl-2">
          <h3 className="text-sm font-bold text-slate-900 mb-2 leading-snug">
            {email.subject}
          </h3>
          
          {/* AI Summary */}
          <div className="bg-slate-50 rounded-lg p-3 border-l-2 border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
              <Sparkles size={12} /> AI Summary
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {email.summary}
            </p>
          </div>

          {/* Search match reason */}
          {isSearchResult && email.matchReason && (
            <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
              <Filter size={10} />
              <span>{email.matchReason}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 pl-2">
          <button 
            onClick={() => onSnooze(email)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-2 py-1.5 rounded-md transition-colors"
          >
            <Clock size={14} /> Snooze
          </button>
          
          <div className="flex items-center gap-2">
            {/* Status badge for search results */}
            {isSearchResult && onStatusChange && (
              <div className="relative">
                <button 
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border uppercase transition-colors ${
                    email.column === 'done' 
                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                      : email.column === 'todo' 
                        ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {email.column}
                  <ChevronDown size={12} />
                </button>
                
                {/* Status dropdown */}
                {showStatusMenu && (
                  <div className="absolute bottom-full mb-1 right-0 bg-white border border-slate-200 shadow-lg rounded-md py-1 w-32 z-50 animate-fade-in">
                    {(['inbox', 'todo', 'done'] as Email['column'][]).map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          onStatusChange(email.id, status);
                          setShowStatusMenu(false);
                        }}
                        className={`block w-full text-left px-3 py-2 text-xs uppercase font-medium hover:bg-slate-50 transition-colors ${
                          email.column === status ? 'text-indigo-600 bg-indigo-50' : 'text-slate-700'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <button className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-md transition-colors">
              Open Mail <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const KanbanColumn: React.FC<{
  id: Email['column'];
  title: string;
  count: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  emails: Email[];
  onSnooze: (email: Email) => void;
  onDropEmail: (emailId: string, targetColumn: Email['column']) => void;
  onReorderEmails: (draggedId: string, hoveredId: string, column: Email['column']) => void;
}> = ({ id, title, count, icon: Icon, emails, onSnooze, onDropEmail, onReorderEmails }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dragOverEmailId, setDragOverEmailId] = useState<string | null>(null);

  // Sort emails by order
  const sortedEmails = emails.sort((a, b) => a.order - b.order);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set to false if we're leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
      setDragOverEmailId(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    setDragOverEmailId(null);
    
    const emailId = e.dataTransfer.getData("emailId");
    if (emailId && dragOverEmailId) {
      // Reorder within the same column or move between columns
      onReorderEmails(emailId, dragOverEmailId, id);
    } else if (emailId) {
      // Just move to column (append at end)
      onDropEmail(emailId, id);
    }
  };

  const handleEmailDragOver = (emailId: string) => {
    setDragOverEmailId(emailId);
  };

  const handleEmailDragLeave = () => {
    setDragOverEmailId(null);
  };

  return (
    <div 
      className={`flex flex-col h-full rounded-lg border transition-colors duration-200 ${
        isDraggingOver 
          ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-100' 
          : 'bg-slate-50/50 border-slate-100'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white/50 backdrop-blur-sm flex-shrink-0 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-slate-600" />
          <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
            {title}
          </h2>
          <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
        <button className="text-slate-400 hover:text-slate-600">
          <MoreHorizontal size={16} />
        </button>
      </div>
      
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-3">
          {sortedEmails.map((email) => (
            <EmailCard 
              key={email.id} 
              email={email} 
              onSnooze={onSnooze} 
              onDragStart={(e, id) => {
                e.dataTransfer.setData("emailId", id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={handleEmailDragOver}
              onDragLeave={handleEmailDragLeave}
              isDraggedOver={dragOverEmailId === email.id}
            />
          ))}
          {emails.length === 0 && (
            <div className={`h-32 flex flex-col items-center justify-center text-slate-400 text-xs border-2 border-dashed rounded-lg transition-colors ${
              isDraggingOver 
                ? 'border-indigo-300 text-indigo-400 bg-indigo-50' 
                : 'border-slate-200'
            }`}>
              <span>{isDraggingOver ? 'Drop here' : 'No items'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SnoozeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const snoozeOptions = [
    { label: 'Later today', time: '6:00 PM', icon: Sun },
    { label: 'Tomorrow', time: '8:00 AM', icon: Calendar },
    { label: 'Next week', time: 'Mon, 8:00 AM', icon: Moon },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-80 overflow-hidden animate-zoom-in border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">Snooze until...</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <LogOut size={16} className="rotate-180" />
          </button>
        </div>
        <div className="p-2">
          {snoozeOptions.map((opt, idx) => (
            <button 
              key={idx} 
              className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-md group text-left transition-colors"
              onClick={onClose}
            >
              <div className="flex items-center gap-3">
                <div className="text-slate-400 group-hover:text-slate-800 transition-colors">
                  <opt.icon size={18} />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                  {opt.label}
                </span>
              </div>
              <span className="text-xs text-slate-400">{opt.time}</span>
            </button>
          ))}
          <div className="h-px bg-slate-100 my-1" />
          <button 
            className="w-full p-3 text-center text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md"
            onClick={onClose}
          >
            Pick date & time
          </button>
        </div>
      </div>
    </div>
  );
};

const SearchResultsView: React.FC<{
  query: string;
  results: Email[];
  onBack: () => void;
  onSnooze: (email: Email) => void;
  onStatusChange: (emailId: string, newColumn: Email['column']) => void;
}> = ({ query, results, onBack, onSnooze, onStatusChange }) => {
  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="p-6 max-w-5xl mx-auto w-full flex-1">
        <button 
          onClick={onBack}
          className="flex items-center text-slate-500 hover:text-slate-900 mb-6 transition-colors text-sm font-medium group"
        >
          <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" /> 
          Back to Board
        </button>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Kết quả tìm kiếm</h2>
          <p className="text-slate-500 mt-1">
            Tìm thấy {results.length} email phù hợp với "{query}"
          </p>
        </div>

        <div className="space-y-4">
          {results.length > 0 ? (
            results.map(email => (
              <EmailCard 
                key={email.id} 
                email={email} 
                onSnooze={onSnooze} 
                isSearchResult={true}
                onStatusChange={onStatusChange}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
              <Search className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-slate-500">Không tìm thấy kết quả nào cho từ khóa này.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InboxPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { 
    emails, 
    searchQuery, 
    searchResults, 
    currentView, 
    snoozeModalOpen,
    error 
  } = useAppSelector(state => state.email);

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Fetch emails on mount
  useEffect(() => {
    dispatch(fetchEmails());
  }, [dispatch]);

  // Organize emails by column and sort by order
  const emailsByColumn = useMemo(() => {
    return {
      inbox: emails.filter(e => e.column === 'inbox').sort((a, b) => a.order - b.order),
      todo: emails.filter(e => e.column === 'todo').sort((a, b) => a.order - b.order),
      done: emails.filter(e => e.column === 'done').sort((a, b) => a.order - b.order),
    };
  }, [emails]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearchQuery.trim()) {
      dispatch(setSearchQuery(localSearchQuery));
      dispatch(setCurrentView('search'));
    } else {
      dispatch(setCurrentView('board'));
    }
  };

  const clearSearch = () => {
    setLocalSearchQuery('');
    dispatch(setSearchQuery(''));
    dispatch(setCurrentView('board'));
  };

  const handleDropEmail = (emailId: string, targetColumn: Email['column']) => {
    dispatch(moveEmailToColumn({ emailId, column: targetColumn }));
  };

  const handleReorderEmails = (draggedId: string, hoveredId: string, column: Email['column']) => {
    // Check if we're moving between columns
    const draggedEmail = emails.find(e => e.id === draggedId);
    if (draggedEmail && draggedEmail.column !== column) {
      // Move to new column first
      dispatch(moveEmailToColumn({ emailId: draggedId, column }));
    }
    // Then reorder within the column
    dispatch(reorderEmailsInColumn({ draggedId, hoveredId, column }));
  };

  const handleSnooze = (email: Email) => {
    dispatch(openSnoozeModal(email));
  };

  const handleStatusChange = (emailId: string, newColumn: Email['column']) => {
    dispatch(moveEmailToColumn({ emailId, column: newColumn }));
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  // Clear any errors
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => dispatch(clearError()), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  return (
    <div className="h-screen bg-white flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white z-20 flex-shrink-0">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => dispatch(setCurrentView('board'))}
        >
          <div className="w-8 h-8 bg-black text-white rounded-md flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <span className="font-bold text-lg tracking-tight hidden md:block">
            AI Email Flow
          </span>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl mx-4">
          <form onSubmit={handleSearchSubmit} className="relative group">
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors cursor-pointer" 
              size={18} 
              onClick={handleSearchSubmit}
            />
            <input 
              type="text" 
              placeholder="Hỏi AI: Tìm hóa đơn tuần trước..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-md py-2.5 pl-10 pr-10 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
            />
            {localSearchQuery && (
              <button 
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <div className="bg-slate-200 rounded-full p-0.5">
                  <ChevronRight className="rotate-45" size={12} />
                </div>
              </button>
            )}
          </form>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-sm font-bold text-slate-600">
              {user?.name?.[0] || 'U'}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden md:block">
              {user?.name || 'User'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-500 hover:text-slate-800 transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-0 bg-white">
        {currentView === 'search' ? (
          <SearchResultsView 
            query={searchQuery} 
            results={searchResults} 
            onBack={clearSearch}
            onSnooze={handleSnooze}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <div className="h-full p-6">
            <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-6">
              <KanbanColumn 
                id="inbox"
                title="Inbox" 
                count={emailsByColumn.inbox.length} 
                icon={Inbox} 
                emails={emailsByColumn.inbox}
                onSnooze={handleSnooze}
                onDropEmail={handleDropEmail}
                onReorderEmails={handleReorderEmails}
              />
              <KanbanColumn 
                id="todo"
                title="To Do" 
                count={emailsByColumn.todo.length} 
                icon={Circle} 
                emails={emailsByColumn.todo}
                onSnooze={handleSnooze}
                onDropEmail={handleDropEmail}
                onReorderEmails={handleReorderEmails}
              />
              <KanbanColumn 
                id="done"
                title="Done" 
                count={emailsByColumn.done.length} 
                icon={CheckCircle2} 
                emails={emailsByColumn.done}
                onSnooze={handleSnooze}
                onDropEmail={handleDropEmail}
                onReorderEmails={handleReorderEmails}
              />
            </div>
          </div>
        )}
      </main>

      {/* Snooze Modal */}
      <SnoozeModal 
        isOpen={snoozeModalOpen} 
        onClose={() => dispatch(closeSnoozeModal())} 
      />
    </div>
  );
};

export default InboxPage;