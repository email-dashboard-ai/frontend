import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '../../hooks/useKeyboardNavigation';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
              <p className="text-sm text-gray-500">Navigate faster with your keyboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 space-y-3">
          {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-700 text-sm">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.key.split(' / ').map((k, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-gray-300 text-xs mx-1">or</span>}
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-md text-xs font-mono text-gray-600 shadow-sm">
                      {k}
                    </kbd>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-600 font-mono">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
