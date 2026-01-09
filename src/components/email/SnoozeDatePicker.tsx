import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, X, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface SnoozeDatePickerProps {
  onConfirm: (dateTime: string) => void;
  onClose: () => void;
}

// Generate hours array (0-23)
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Generate minutes array (0, 5, 10, ..., 55)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

// Mini Calendar Component
interface MiniCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
  minDate: Date;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ selectedDate, onSelectDate, onClose, minDate }) => {
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1));

  const isDisabled = (day: number) => {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    return date < min;
  };

  const isSelected = (day: number) => {
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === day
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(year, month, day);
    onSelectDate(newDate);
    onClose();
  };

  const canGoPrev = () => {
    const prevM = new Date(year, month - 1, 1);
    const minM = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    return prevM >= minM;
  };

  return (
    <div
      ref={calendarRef}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-50 w-[280px]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev()}
          className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        <span className="font-semibold text-gray-900">
          {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ChevronRight size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => (
          <div key={idx} className="aspect-square flex items-center justify-center">
            {day !== null ? (
              <button
                onClick={() => !isDisabled(day) && handleSelectDay(day)}
                disabled={isDisabled(day)}
                className={`w-full h-full rounded-lg text-sm font-medium transition-all ${isSelected(day)
                  ? 'bg-blue-600 text-white'
                  : isToday(day)
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : isDisabled(day)
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                {day}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

const SnoozeDatePicker: React.FC<SnoozeDatePickerProps> = ({ onConfirm, onClose }) => {
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Default to tomorrow
    return d;
  });
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [error, setError] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  // Scroll to selected values on mount
  useEffect(() => {
    if (hourScrollRef.current) {
      const itemHeight = 40;
      hourScrollRef.current.scrollTop = selectedHour * itemHeight - 80;
    }
    if (minuteScrollRef.current) {
      const itemHeight = 40;
      minuteScrollRef.current.scrollTop = (selectedMinute / 5) * itemHeight - 80;
    }
  }, [selectedHour, selectedMinute]);

  const handleConfirm = () => {
    const finalDate = new Date(selectedDate);
    finalDate.setHours(selectedHour, selectedMinute, 0, 0);

    if (finalDate <= new Date()) {
      setError('Please select a future date and time');
      return;
    }

    onConfirm(finalDate.toISOString());
    onClose();
  };

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCalendar) {
          setShowCalendar(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, showCalendar]);

  // Date navigation
  const goToPrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    if (newDate >= now) {
      setSelectedDate(newDate);
      setError('');
    }
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
    setError('');
  };

  const formatDateDisplay = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12} ${period}`;
  };

  const formatMinute = (m: number) => m.toString().padStart(2, '0');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={20} />
              <h3 className="text-lg font-semibold">Custom Snooze Time</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-blue-100 mt-1">Pick when to be reminded</p>
        </div>

        {/* Date Selector */}
        <div className="border-b border-gray-100 px-4 py-3 relative">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPrevDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={selectedDate.toDateString() === now.toDateString()}
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Calendar size={18} className="text-blue-600" />
              <span className="font-semibold text-gray-900">{formatDateDisplay(selectedDate)}</span>
            </button>
            <button
              onClick={goToNextDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Calendar Dropdown */}
          {showCalendar && (
            <MiniCalendar
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setError('');
              }}
              onClose={() => setShowCalendar(false)}
              minDate={now}
            />
          )}
        </div>

        {/* Time Picker */}
        <div className="p-4">
          <div className="flex justify-center items-center gap-4 relative">
            {/* Hour Column */}
            <div className="relative">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-blue-50 rounded-lg border-2 border-blue-200 pointer-events-none z-0" />
              <div
                ref={hourScrollRef}
                className="h-[200px] overflow-y-auto scrollbar-hide relative z-10"
                style={{ scrollSnapType: 'y mandatory' }}
              >
                <div className="h-[80px]" /> {/* Spacer */}
                {HOURS.map((h) => (
                  <button
                    key={h}
                    onClick={() => { setSelectedHour(h); setError(''); }}
                    className={`w-20 h-10 flex items-center justify-center text-lg font-medium transition-all ${selectedHour === h
                      ? 'text-blue-600 scale-110'
                      : 'text-gray-400 hover:text-gray-600'
                      }`}
                    style={{ scrollSnapAlign: 'center' }}
                  >
                    {formatHour(h)}
                  </button>
                ))}
                <div className="h-[80px]" /> {/* Spacer */}
              </div>
            </div>

            {/* Separator */}
            <span className="text-3xl font-bold text-gray-300 pb-1">:</span>

            {/* Minute Column */}
            <div className="relative">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-blue-50 rounded-lg border-2 border-blue-200 pointer-events-none z-0" />
              <div
                ref={minuteScrollRef}
                className="h-[200px] overflow-y-auto scrollbar-hide relative z-10"
                style={{ scrollSnapType: 'y mandatory' }}
              >
                <div className="h-[80px]" /> {/* Spacer */}
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    onClick={() => { setSelectedMinute(m); setError(''); }}
                    className={`w-16 h-10 flex items-center justify-center text-lg font-medium transition-all ${selectedMinute === m
                      ? 'text-blue-600 scale-110'
                      : 'text-gray-400 hover:text-gray-600'
                      }`}
                    style={{ scrollSnapAlign: 'center' }}
                  >
                    {formatMinute(m)}
                  </button>
                ))}
                <div className="h-[80px]" /> {/* Spacer */}
              </div>
            </div>
          </div>

          {/* Selected Time Preview */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Snooze until{' '}
              <span className="font-semibold text-gray-900">
                {formatDateDisplay(selectedDate)} at {formatHour(selectedHour)}:{formatMinute(selectedMinute)}
              </span>
            </p>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default SnoozeDatePicker;
