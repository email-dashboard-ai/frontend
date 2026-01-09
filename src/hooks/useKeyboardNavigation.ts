import { useEffect, useCallback, useState } from 'react';
import { ParsedEmail } from '../types/gmail';

interface UseKeyboardNavigationOptions {
  messages: ParsedEmail[];
  selectedMessage: ParsedEmail | null;
  onSelectMessage: (message: ParsedEmail | null) => void;
  onDeleteMessage?: (messageId: string) => void;
  onToggleStar?: (messageId: string, isStarred: boolean) => void;
  onFocusSearch?: () => void;
  enabled?: boolean;
}

interface KeyboardNavigationState {
  focusedIndex: number;
}

export const useKeyboardNavigation = ({
  messages,
  selectedMessage,
  onSelectMessage,
  onDeleteMessage,
  onToggleStar,
  onFocusSearch,
  enabled = true,
}: UseKeyboardNavigationOptions) => {
  const [state, setState] = useState<KeyboardNavigationState>({
    focusedIndex: -1,
  });

  // Sync focusedIndex with selectedMessage
  useEffect(() => {
    if (selectedMessage) {
      const index = messages.findIndex(m => m.id === selectedMessage.id);
      if (index !== -1 && index !== state.focusedIndex) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(prev => ({ ...prev, focusedIndex: index }));
      }
    }
  }, [selectedMessage, messages]);

  // Check if user is typing in an input field
  const isTyping = useCallback(() => {
    const active = document.activeElement;
    if (!active) return false;
    const tagName = active.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      (active as HTMLElement).isContentEditable
    );
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || isTyping()) return;

      const { key } = e;
      const messagesCount = messages.length;

      switch (key) {
        // Navigation: j or ArrowDown = next
        case 'j':
        case 'ArrowDown':
          if (messagesCount === 0) return;
          e.preventDefault();
          setState(prev => {
            const newIndex = prev.focusedIndex < messagesCount - 1
              ? prev.focusedIndex + 1
              : 0;
            const message = messages[newIndex];
            if (message) {
              onSelectMessage(message);
            }
            return { focusedIndex: newIndex };
          });
          break;

        // Navigation: k or ArrowUp = previous
        case 'k':
        case 'ArrowUp':
          if (messagesCount === 0) return;
          e.preventDefault();
          setState(prev => {
            const newIndex = prev.focusedIndex > 0
              ? prev.focusedIndex - 1
              : messagesCount - 1;
            const message = messages[newIndex];
            if (message) {
              onSelectMessage(message);
            }
            return { focusedIndex: newIndex };
          });
          break;

        // Close/Deselect: Escape
        case 'Escape':
          e.preventDefault();
          onSelectMessage(null);
          setState({ focusedIndex: -1 });
          break;

        // Star: s
        case 's':
          if (state.focusedIndex >= 0 && state.focusedIndex < messagesCount) {
            e.preventDefault();
            const message = messages[state.focusedIndex];
            if (message && onToggleStar) {
              onToggleStar(message.id, message.isStarred);
            }
          }
          break;

        // Delete: Delete key only
        case 'Delete':
          if (state.focusedIndex >= 0 && state.focusedIndex < messagesCount) {
            e.preventDefault();
            const message = messages[state.focusedIndex];
            if (message && onDeleteMessage) {
              onDeleteMessage(message.id);
              // Move to next email after delete
              setState(prev => ({
                focusedIndex: Math.min(prev.focusedIndex, messagesCount - 2),
              }));
            }
          }
          break;

        // Focus search: /
        case '/':
          e.preventDefault();
          if (onFocusSearch) {
            onFocusSearch();
          }
          break;

        default:
          break;
      }
    },
    [enabled, isTyping, messages, state.focusedIndex, onSelectMessage, onDeleteMessage, onToggleStar, onFocusSearch]
  );

  // Add/remove event listener
  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return {
    focusedIndex: state.focusedIndex,
    setFocusedIndex: (index: number) => setState({ focusedIndex: index }),
  };
};

// Keyboard shortcuts reference - simplified
export const KEYBOARD_SHORTCUTS = [
  { key: 'j / ↓', description: 'Next email' },
  { key: 'k / ↑', description: 'Previous email' },
  { key: 's', description: 'Star / Unstar' },
  { key: 'Delete', description: 'Delete email' },
  { key: '/', description: 'Focus search' },
  { key: 'Esc', description: 'Close / Deselect' },
  { key: '?', description: 'Toggle shortcuts' },
];

