import React from 'react';
import { Clock, Calendar, X } from 'lucide-react';

interface SnoozeOption {
  label: string;
  value: 'later-today' | 'tomorrow' | 'weekend' | 'next-week' | 'custom';
  icon: React.ReactNode;
}

interface EmailContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  onSnooze: (option: string) => void;
}

const EmailContextMenu: React.FC<EmailContextMenuProps> = ({ position, onClose, onSnooze }) => {
  const snoozeOptions: SnoozeOption[] = [
    { label: 'Later today (6 PM)', value: 'later-today', icon: <Clock size={16} /> },
    { label: 'Tomorrow (9 AM)', value: 'tomorrow', icon: <Clock size={16} /> },
    { label: 'This weekend (Sat 9 AM)', value: 'weekend', icon: <Clock size={16} /> },
    { label: 'Next week (Mon 9 AM)', value: 'next-week', icon: <Clock size={16} /> },
    { label: 'Custom...', value: 'custom', icon: <Calendar size={16} /> },
  ];

  const handleOptionClick = (value: string) => {
    onSnooze(value);
    onClose();
  };

  // Close on ESC key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.context-menu')) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Context Menu */}
      <div
        className="context-menu fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[220px] animate-in fade-in zoom-in-95 duration-100"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Snooze until</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
        
        <div className="py-1">
          {snoozeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleOptionClick(option.value)}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3 group"
            >
              <span className="text-gray-400 group-hover:text-blue-500 transition-colors">
                {option.icon}
              </span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default EmailContextMenu;
