import { useEffect, useCallback, useState } from 'react';
import { ParsedEmail } from '../types/gmail';

interface UseKeyboardNavigationOptions {
  messages: ParsedEmail[];
  selectedMessage: ParsedEmail | null;
  onSelectMessage: (message: ParsedEmail | null) => void;
  onClearSelection?: () => void;  // NEW: Callback to clear checkboxes
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
  onClearSelection,
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
  }, [selectedMessage, messages, state.focusedIndex]);

  // Check if user is typing in an input field
  const isTyping = useCallback(() => {
    const active = document.activeElement;
    if (!active || active === document.body) return false;

    const tagName = active.tagName.toLowerCase();

    if (tagName === 'input') {
      const type = (active as HTMLInputElement).type;
      // Only block shortcuts for text-entry inputs
      return ['text', 'password', 'email', 'search', 'number', 'tel', 'url'].includes(type);
    }

    return (
      tagName === 'textarea' ||
      (active as HTMLElement).isContentEditable
    );
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Always allow Escape to work
      if (e.key === 'Escape') {
        e.preventDefault();

        // If typing, blur the input
        if (isTyping()) {
          const active = document.activeElement as HTMLElement;
          if (active) {
            // Force blur with timeout to ensure UI updates
            setTimeout(() => active.blur(), 0);
          }
          return;
        }

        // If not typing, deselect message AND clear checkbox selection
        if (enabled) {
          onSelectMessage(null);
          if (onClearSelection) {
            onClearSelection();
          }
          setState({ focusedIndex: -1 });
        }
        return;
      }

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
            const nextIndex = prev.focusedIndex < messagesCount - 1
              ? prev.focusedIndex + 1
              : 0;
            const message = messages[nextIndex];
            if (message) {
              onSelectMessage(message);
            }
            return { focusedIndex: nextIndex };
          });
          break;

        // Navigation: k or ArrowUp = previous
        case 'k':
        case 'ArrowUp':
          if (messagesCount === 0) return;
          e.preventDefault();
          setState(prev => {
            const prevIndex = prev.focusedIndex > 0
              ? prev.focusedIndex - 1
              : messagesCount - 1;
            const message = messages[prevIndex];
            if (message) {
              onSelectMessage(message);
            }
            return { focusedIndex: prevIndex };
          });
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
              const nextIndex = Math.min(state.focusedIndex, messagesCount - 2);
              setState({ focusedIndex: nextIndex });
              // Select the new message at this index if possible
              if (nextIndex >= 0 && messages[nextIndex]) {
                onSelectMessage(messages[nextIndex]);
              } else {
                onSelectMessage(null);
              }
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
    [enabled, isTyping, messages, state.focusedIndex, onSelectMessage, onDeleteMessage, onToggleStar, onFocusSearch, onClearSelection]
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

