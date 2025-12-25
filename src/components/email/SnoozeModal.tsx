import React from 'react';
import { ParsedEmail } from '../../types/gmail';
import { Clock, X, Sun, ArrowRight, Calendar } from 'lucide-react';

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
          <div className="grid gap-2">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOption(option.id)}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${option.id === 'custom' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                    <option.icon size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{option.label}</div>
                    {option.desc && <div className="text-xs text-slate-500">{option.desc}</div>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SnoozeModal;
