import React, { useState, useCallback, useEffect } from 'react';
import { ParsedEmail, GmailLabel } from '../../types/gmail';
import { Star, CheckCircle2, Inbox as InboxIcon } from 'lucide-react';
import { aiService } from '../../services/aiService';
import SnoozeDatePicker from './SnoozeDatePicker';
import SnoozeModal from './SnoozeModal';
import SummaryModal from './SummaryModal';
import KanbanColumn from './kanban/KanbanColumn';

interface KanbanViewProps {
  messages: ParsedEmail[];
  labels: GmailLabel[];
  kanbanStatuses: Record<string, string>;
  onMessageClick: (message: ParsedEmail) => void;
  onToggleStar: (id: string, isStarred: boolean) => void;
  onUpdateStatus: (id: string, newStatus: 'inbox' | 'important' | 'done') => void;
  onSnooze?: (emailId: string, snoozedUntil: string) => void;
  onLoadMore?: () => void;
}

const KanbanView: React.FC<KanbanViewProps> = ({
  messages,
  labels,
  kanbanStatuses,
  onMessageClick,
  onToggleStar: _onToggleStar,
  onUpdateStatus,
  onSnooze,
  onLoadMore
}) => {
  // AI Summary State
  const [summariesById, setSummariesById] = useState<Record<string, string>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [modalEmail, setModalEmail] = useState<ParsedEmail | null>(null); // For AI Summary Modal
  const [snoozeModalEmail, setSnoozeModalEmail] = useState<ParsedEmail | null>(null); // For Snooze Options Modal
  const [customSnoozeEmail, setCustomSnoozeEmail] = useState<ParsedEmail | null>(null); // For Date Picker

  // Refs to keep track of latest state without triggering re-creation of callbacks
  const summariesRef = React.useRef(summariesById);
  const loadingIdsRef = React.useRef(loadingIds);
  const messagesRef = React.useRef(messages);

  useEffect(() => {
    summariesRef.current = summariesById;
    loadingIdsRef.current = loadingIds;
    messagesRef.current = messages;
  }, [summariesById, loadingIds, messages]);

  const handleShowSummaryModal = useCallback((email: ParsedEmail) => {
    setModalEmail(email);
  }, []);

  const handleCardVisible = useCallback(async (emailId: string) => {
    // Check against refs to avoid closure staleness without dependency updates
    if (summariesRef.current[emailId] || loadingIdsRef.current.has(emailId)) return;

    const email = messagesRef.current.find(m => m.id === emailId);
    if (!email) return;

    // Skip if email is too short to summarize
    if ((email.snippet?.length || 0) < 50 && (email.body?.length || 0) < 100) return;

    setLoadingIds(prev => new Set(prev).add(emailId));

    try {
      const response = await aiService.summarizeEmail({
        messageId: emailId,
        content: email.body || email.snippet || ''
      });
      setSummariesById(prev => ({ ...prev, [emailId]: response.summary }));
    } catch (error) {
      console.error(`Failed to summarize email ${emailId}:`, error);
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(emailId);
        return next;
      });
    }
  }, []); // Stable callback with no dependencies

  const handleSnooze = useCallback((emailId: string, snoozedUntil: string) => {
    if (onSnooze) {
      onSnooze(emailId, snoozedUntil);
    }
  }, [onSnooze]);

  const handleSnoozeRequest = useCallback((email: ParsedEmail) => {
    setSnoozeModalEmail(email);
  }, []);

  const handleDropEmail = useCallback((emailId: string, targetColumn: 'inbox' | 'important' | 'done') => {
    const email = messages.find(m => m.id === emailId);
    if (!email) return;

    if (targetColumn === 'important') {
      onUpdateStatus(emailId, 'important');
    } else if (targetColumn === 'inbox') {
      onUpdateStatus(emailId, 'inbox');
    } else if (targetColumn === 'done') {
      onUpdateStatus(emailId, 'done');
    }
  }, [messages, onUpdateStatus]);

  // Handle scroll for load more logic
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>, columnId: string) => {
    const element = e.currentTarget;
    // Check if scrolled near bottom (within 50px)
    const bottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;

    if (bottom && onLoadMore && columnId === 'inbox') {
      onLoadMore();
    }
  }, [onLoadMore]);

  // Filter messages based on Backend Status (sorting/filtering now handled per-column)
  const inboxEmails = messages.filter(e => {
    const status = kanbanStatuses[e.id];
    return !status || status === 'INBOX';
  });

  const importantEmails = messages.filter(e =>
    kanbanStatuses[e.id] === 'IN_PROGRESS'
  );

  const doneEmails = messages.filter(e =>
    kanbanStatuses[e.id] === 'DONE'
  );

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 overflow-hidden p-6 w-full">
        <div className="h-full w-full grid gap-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <KanbanColumn
            id="inbox"
            title="Inbox"
            count={inboxEmails.length}
            icon={InboxIcon}
            emails={inboxEmails}
            labels={labels}
            summariesById={summariesById}
            loadingIds={loadingIds}
            onSnooze={handleSnoozeRequest}
            onDropEmail={handleDropEmail}
            onMessageClick={onMessageClick}
            onCardVisible={handleCardVisible}
            onShowSummaryModal={handleShowSummaryModal}
            onScroll={handleScroll}
          />
          <KanbanColumn
            id="important"
            title="In Progress"
            count={importantEmails.length}
            icon={Star}
            emails={importantEmails}
            labels={labels}
            summariesById={summariesById}
            loadingIds={loadingIds}
            onSnooze={handleSnoozeRequest}
            onDropEmail={handleDropEmail}
            onMessageClick={onMessageClick}
            onCardVisible={handleCardVisible}
            onShowSummaryModal={handleShowSummaryModal}
            onScroll={handleScroll}
          />
          <KanbanColumn
            id="done"
            title="Done"
            count={doneEmails.length}
            icon={CheckCircle2}
            emails={doneEmails}
            labels={labels}
            summariesById={summariesById}
            loadingIds={loadingIds}
            onSnooze={handleSnoozeRequest}
            onDropEmail={handleDropEmail}
            onMessageClick={onMessageClick}
            onCardVisible={handleCardVisible}
            onShowSummaryModal={handleShowSummaryModal}
            onScroll={handleScroll}
          />
        </div>
      </div>

      {/* AI Summary Modal */}
      {modalEmail && (
        <SummaryModal
          email={modalEmail}
          summary={summariesById[modalEmail.id]}
          onClose={() => setModalEmail(null)}
          onView={() => onMessageClick(modalEmail)}
        />
      )}

      {/* Snooze Options Modal */}
      {snoozeModalEmail && (
        <SnoozeModal
          email={snoozeModalEmail}
          onSnooze={handleSnooze}
          onCustom={(email) => setCustomSnoozeEmail(email)}
          onClose={() => setSnoozeModalEmail(null)}
        />
      )}

      {/* Custom Date Picker Modal */}
      {customSnoozeEmail && (
        <SnoozeDatePicker
          onClose={() => setCustomSnoozeEmail(null)}
          onConfirm={(dateTime) => {
            handleSnooze(customSnoozeEmail.id, dateTime);
            setCustomSnoozeEmail(null);
          }}
        />
      )}
    </div>
  );
};

export default KanbanView;
