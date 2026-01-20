import React, { useState, useCallback, useEffect } from "react";
import { ParsedEmail, GmailLabel } from "../../types/gmail";
import { Settings } from "lucide-react";
import { aiService } from "../../services/aiService";
import { kanbanService } from "../../services/kanbanService";
import { api } from "../../config/apiConfig";
import { KanbanColumn as KanbanColumnType } from "../../types/kanban";
import { indexedDBService } from "../../services/indexedDBService";
import SnoozeDatePicker from "./SnoozeDatePicker";
import SnoozeModal from "./SnoozeModal";
import SummaryModal from "./SummaryModal";
import KanbanColumnCard from "./kanban/KanbanColumn";
import KanbanSettingsModal from "../kanban/KanbanSettingsModal";
import toast from "react-hot-toast";

interface KanbanViewProps {
  messages: ParsedEmail[];
  labels: GmailLabel[];
  kanbanStatuses: Record<string, string>;
  onMessageClick: (message: ParsedEmail) => void;
  onToggleStar?: (messageId: string, isStarred: boolean) => void;
  onSnooze?: (emailId: string, snoozedUntil: string) => void;
  onLoadMore?: () => void;
  isLoading?: boolean;
  onMessagesChange?: (messages: ParsedEmail[]) => void;
}

const KanbanView: React.FC<KanbanViewProps> = ({
  messages,
  labels,
  kanbanStatuses,
  onMessageClick,
  onSnooze,
  onLoadMore,
  isLoading,
  onMessagesChange,
}) => {
  // Dynamic Columns State
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Local state for immediate UI updates
  const [localMessages, setLocalMessages] = useState<ParsedEmail[]>(messages);

  // Sync local state when props change
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  // AI Summary State
  const [summariesById, setSummariesById] = useState<Record<string, string>>(
    {},
  );
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [modalEmail, setModalEmail] = useState<ParsedEmail | null>(null);
  const [snoozeModalEmail, setSnoozeModalEmail] = useState<ParsedEmail | null>(
    null,
  );
  const [customSnoozeEmail, setCustomSnoozeEmail] =
    useState<ParsedEmail | null>(null);

  // Refs to keep track of latest state
  const summariesRef = React.useRef(summariesById);
  const loadingIdsRef = React.useRef(loadingIds);
  const messagesRef = React.useRef(messages);

  useEffect(() => {
    summariesRef.current = summariesById;
    loadingIdsRef.current = loadingIds;
    messagesRef.current = messages;
  }, [summariesById, loadingIds, messages]);

  // Fetch columns on mount
  useEffect(() => {
    fetchColumns();
  }, []);

  const fetchColumns = async () => {
    try {
      setLoadingColumns(true);
      const fetchedColumns = await kanbanService.getColumns();
      setColumns(fetchedColumns);
    } catch (error: unknown) {
      console.error("Failed to fetch Kanban columns:", error);
      toast.error("Failed to load Kanban columns");
    } finally {
      setLoadingColumns(false);
    }
  };

  const handleShowSummaryModal = useCallback((email: ParsedEmail) => {
    setModalEmail(email);
  }, []);

  const handleCardVisible = useCallback(async (emailId: string) => {
    if (summariesRef.current[emailId] || loadingIdsRef.current.has(emailId))
      return;

    const email = messagesRef.current.find((m) => m.id === emailId);
    if (!email) return;

    if ((email.snippet?.length || 0) < 50 && (email.body?.length || 0) < 100)
      return;

    setLoadingIds((prev) => new Set(prev).add(emailId));

    try {
      const response = await aiService.summarizeEmail({
        messageId: emailId,
        content: email.body || email.snippet || "",
      });
      setSummariesById((prev) => ({ ...prev, [emailId]: response.summary }));
    } catch (error) {
      console.error(`Failed to summarize email ${emailId}:`, error);
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(emailId);
        return next;
      });
    }
  }, []);

  const handleSnooze = useCallback(
    (emailId: string, snoozedUntil: string) => {
      if (onSnooze) {
        onSnooze(emailId, snoozedUntil);
      }
    },
    [onSnooze],
  );

  const handleSnoozeRequest = useCallback((email: ParsedEmail) => {
    setSnoozeModalEmail(email);
  }, []);

  const handleDropEmail = useCallback(
    async (emailId: string, targetColumnId: string) => {
      const email = localMessages.find((m) => m.id === emailId);
      if (!email) return;

      const targetColumn = columns.find((c) => c.columnId === targetColumnId);
      if (!targetColumn) return;

      // Optimistic update - update UI immediately
      const updatedMessages = localMessages.map((msg) => {
        if (msg.id === emailId) {
          const updatedMsg = { ...msg };
          const newLabels = [...(updatedMsg.labelIds || [])];

          // Remove labels from other columns
          columns.forEach((col) => {
            if (col.columnId !== targetColumnId && col.gmailLabelId) {
              const idx = newLabels.indexOf(col.gmailLabelId);
              if (idx > -1) newLabels.splice(idx, 1);
            }
          });

          // Add target column label
          if (
            targetColumn.gmailLabelId &&
            !newLabels.includes(targetColumn.gmailLabelId)
          ) {
            newLabels.push(targetColumn.gmailLabelId);
          }

          updatedMsg.labelIds = newLabels;
          return updatedMsg;
        }
        return msg;
      });

      // Update local state immediately
      setLocalMessages(updatedMessages);

      // Notify parent to update cache
      if (onMessagesChange) {
        onMessagesChange(updatedMessages);
      }

      try {
        // Call API in background
        await api.post("/api/kanban/move", null, {
          params: {
            emailId,
            targetColumnId,
          },
        });

        console.log(
          `✅ Email ${emailId} moved to ${targetColumnId} successfully`,
        );

        // Invalidate IndexedDB cache for affected labels
        const affectedLabelIds = new Set<string>();

        // Add source column labels
        columns.forEach((col) => {
          if (col.gmailLabelId && email.labelIds?.includes(col.gmailLabelId)) {
            affectedLabelIds.add(col.gmailLabelId);
          }
        });

        // Add target column label
        if (targetColumn.gmailLabelId) {
          affectedLabelIds.add(targetColumn.gmailLabelId);
        }

        // Invalidate cache for all affected labels
        const userEmail = localStorage.getItem("userEmail");
        if (userEmail) {
          for (const labelId of affectedLabelIds) {
            await indexedDBService.invalidateLabelCache(userEmail, labelId);
          }
        }
      } catch (error: unknown) {
        console.error("Failed to move email:", error);
        toast.error("Failed to move email");

        // Revert optimistic update on error
        setLocalMessages(messages);
        if (onMessagesChange) {
          onMessagesChange(messages);
        }
      }
    },
    [localMessages, messages, columns, onMessagesChange],
  );

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>, columnId: string) => {
      if (columnId !== "inbox" || !onLoadMore) return;

      const element = e.currentTarget;
      const bottom =
        element.scrollHeight - element.scrollTop <= element.clientHeight + 100;

      if (bottom) {
        console.log(`Load more triggered for ${columnId}`);
        onLoadMore();
      }
    },
    [onLoadMore],
  );

  const handleDeleteColumn = async (columnId: string) => {
    try {
      const column = columns.find((c) => c.columnId === columnId);
      if (!column) return;

      await kanbanService.deleteColumn(column.id);
      toast.success("Column deleted successfully");
      fetchColumns();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Failed to delete column",
      );
    }
  };

  // Filter messages by column using Gmail labels and backend status
  const getEmailsForColumn = (column: KanbanColumnType): ParsedEmail[] => {
    // If column has Gmail label mapping, filter by label
    if (column.gmailLabelId) {
      return localMessages.filter((email) =>
        email.labelIds?.includes(column.gmailLabelId!),
      );
    }

    // For columns without Gmail mapping, use database status (fallback)
    return messages.filter((email) => {
      const status = kanbanStatuses[email.id];
      // Map backend status to column ID
      if (!status || status === "INBOX") return column.columnId === "inbox";
      if (status === "TO_DO") return column.columnId === "todo";
      if (status === "IN_PROGRESS") {
        // Show in 'in_progress' OR any custom non-synced column (fallback)
        return (
          column.columnId === "in_progress" ||
          (!column.isDefault && !column.gmailLabelId)
        );
      }
      if (status === "DONE") return column.columnId === "done";
      return false;
    });
  };

  // Get icon for column (you can customize this)
  const getColumnIcon = () => {
    // Return null for now, or you can import icons dynamically
    return null;
  };

  if (loadingColumns) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-gray-500">Loading Kanban board...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute top-14 right-6 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-100 shadow-md">
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Syncing Gmail
          </span>
        </div>
      )}

      {/* Header with Settings Button */}
      <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Kanban Board</h2>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          title="Kanban Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 overflow-hidden p-6 w-full">
        <div
          className="h-full w-full grid gap-6"
          style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
        >
          {columns.map((column) => {
            const emails = getEmailsForColumn(column);
            return (
              <KanbanColumnCard
                key={column.id}
                id={column.columnId}
                title={column.name}
                count={emails.length}
                icon={getColumnIcon()}
                emails={emails}
                labels={labels}
                summariesById={summariesById}
                loadingIds={loadingIds}
                onSnooze={handleSnoozeRequest}
                onDropEmail={handleDropEmail}
                onMessageClick={onMessageClick}
                onCardVisible={handleCardVisible}
                onShowSummaryModal={handleShowSummaryModal}
                onScroll={handleScroll}
                color={column.color}
                isDefault={column.isDefault}
                onDelete={handleDeleteColumn}
              />
            );
          })}
        </div>
      </div>

      {/* AI Summary Modal */}
      {modalEmail && (
        <SummaryModal
          email={modalEmail}
          summary={summariesById[modalEmail.id]}
          onClose={() => setModalEmail(null)}
          onView={() => onMessageClick(modalEmail)}
          onSummaryUpdate={(emailId, newSummary) => {
            setSummariesById((prev) => ({ ...prev, [emailId]: newSummary }));
          }}
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

      {/* Settings Modal */}
      {showSettings && (
        <KanbanSettingsModal
          columns={columns}
          onClose={() => setShowSettings(false)}
          onColumnsUpdated={fetchColumns}
        />
      )}
    </div>
  );
};

export default KanbanView;
