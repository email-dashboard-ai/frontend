import React, { useEffect, useState, useRef, useCallback } from "react";
import { Toaster } from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store";
import {
  fetchLabels,
  fetchMessages,
  setSelectedLabel,
  setSelectedMessage,
  clearMessages,
} from "../store/slices/gmailSlice";
import { logout } from "../store/slices/authSlice";
import {
  GmailLabel,
  ParsedEmail,
  SearchResult,
  EmailPageResponse,
} from "../types/gmail";
import { LogOut, X, Settings } from "lucide-react";
import { gmailService } from "../services/gmailService";

// Components
import EmailSidebar from "../components/email/EmailSidebar";
import EmailList from "../components/email/EmailList";
import EmailDetail from "../components/email/EmailDetail";
import ComposeEmailModal from "../components/email/ComposeEmailModal";
import KanbanView from "../components/email/KanbanView";
import SearchPanel from "../components/email/SearchPanel";
import SearchResults from "../components/email/SearchResults";
import KeyboardShortcutsModal from "../components/email/KeyboardShortcutsModal";
import SettingsModal from "../components/common/SettingsModal";

// Hooks
import { useResizableLayout } from "../hooks/useResizableLayout";
import { useEmailActions } from "../hooks/useEmailActions";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";

const EmailDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);
  const {
    labels,
    selectedLabel,
    messages,
    selectedMessage,
    isLoading,
    error,
    nextPageToken,
  } = useAppSelector((state) => state.gmail);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchRequest, setSearchRequest] = useState<{ body?: string }>({});
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileDetailView, setIsMobileDetailView] = useState(false);
  const [pageToken, setPageToken] = useState<string | undefined>(undefined);
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [kanbanStatuses, setKanbanStatuses] = useState<Record<string, string>>(
    {},
  );
  const [snoozedInfo, setSnoozedInfo] = useState<Record<string, string>>({});
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Kanban-specific state
  const [kanbanMessages, setKanbanMessages] = useState<ParsedEmail[]>([]);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [kanbanCacheKey, setKanbanCacheKey] = useState<string>("");

  // Load cached Kanban messages on mount for fast initial render
  useEffect(() => {
    if (user?.email && viewMode === "kanban") {
      const cached = localStorage.getItem(`kanban_emails_${user.email}`);
      if (cached) {
        try {
          const { emails, key } = JSON.parse(cached);
          console.log("Loaded Kanban cache:", emails.length, "emails");
          setKanbanMessages(emails);
          setKanbanCacheKey(key);
        } catch (e) {
          console.error("Failed to parse cached Kanban emails", e);
        }
      }
    }
  }, [user?.email, viewMode]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    // Safari fallback
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const fetchKanbanStatuses = useCallback(async () => {
    try {
      const statuses = await gmailService.getKanbanStatuses();
      setKanbanStatuses(statuses);
    } catch (error) {
      console.error("Failed to fetch kanban statuses", error);
    }
  }, []);

  const fetchSnoozedInfo = useCallback(async () => {
    try {
      const info = await gmailService.getSnoozedEmailsInfo();
      setSnoozedInfo(info);
    } catch (error) {
      console.error("Failed to fetch snoozed info", error);
    }
  }, []);

  // Fetch Kanban emails when switching to Kanban view (always fresh from backend)
  const fetchKanbanEmails = useCallback(async () => {
    if (!user?.email) return;

    try {
      setKanbanLoading(true);

      // Get all Kanban columns
      const columns = await gmailService.getKanbanColumns();

      // Extract label IDs from columns that have Gmail labels
      const labelIds = columns
        .map((col) => col.gmailLabelId)
        .filter((id): id is string => id !== null && id !== undefined);

      if (labelIds.length === 0) {
        setKanbanMessages([]);
        setKanbanLoading(false);
        return;
      }

      // Create cache key from sorted label IDs
      const cacheKey = labelIds.sort().join(",");

      // If we have valid cache, skip refetch
      if (kanbanCacheKey === cacheKey && kanbanMessages.length > 0) {
        console.log("Using cached Kanban data");
        setKanbanLoading(false);
        return;
      }

      console.log(
        `Fetching emails for ${labelIds.length} Kanban columns (20 per column)...`,
      );

      // Fetch emails for each label in parallel (limit 20 per column for speed)
      const emailPromises = labelIds.map((labelId: string) =>
        gmailService
          .getMessages(labelId, undefined, 20)
          .catch((err: unknown) => {
            console.error(`Failed to fetch emails for label ${labelId}:`, err);
            return { messages: [], nextPageToken: null };
          }),
      );

      const results = await Promise.all(emailPromises);
      const allEmails = results.flatMap(
        (result: EmailPageResponse) => result.messages || [],
      );

      // Deduplicate emails by ID (in case an email has multiple Kanban labels)
      const uniqueEmailsMap = new Map<string, ParsedEmail>();
      allEmails.forEach((email: ParsedEmail) => {
        if (!uniqueEmailsMap.has(email.id)) {
          uniqueEmailsMap.set(email.id, email);
        }
      });

      const uniqueEmails = Array.from(uniqueEmailsMap.values());
      console.log(
        `Fetched ${uniqueEmails.length} unique emails for Kanban view`,
      );

      setKanbanMessages(uniqueEmails);
      setKanbanCacheKey(cacheKey);

      // Save to cache
      if (user?.email) {
        localStorage.setItem(
          `kanban_emails_${user.email}`,
          JSON.stringify({ emails: uniqueEmails, key: cacheKey }),
        );
      }
    } catch (error) {
      console.error("Failed to fetch Kanban emails:", error);
    } finally {
      setKanbanLoading(false);
    }
  }, [user?.email, kanbanCacheKey, kanbanMessages.length]);

  // Callback to handle optimistic updates and refetch signals
  const handleKanbanMessagesChange = useCallback(
    (messages: ParsedEmail[]) => {
      if (messages.length === 0) {
        // Signal to refetch from backend (after error or need fresh data)
        console.log("Refetching Kanban data after operation...");
        setKanbanCacheKey(""); // Clear cache key to force refetch
        Promise.all([fetchKanbanStatuses(), fetchKanbanEmails()]).then(() => {
          console.log("Kanban data refreshed");
        });
      } else {
        // Optimistic update - update state and cache immediately
        setKanbanMessages(messages);
        if (user?.email && kanbanCacheKey) {
          localStorage.setItem(
            `kanban_emails_${user.email}`,
            JSON.stringify({ emails: messages, key: kanbanCacheKey }),
          );
        }
      }
    },
    [user?.email, kanbanCacheKey, fetchKanbanStatuses, fetchKanbanEmails],
  );

  useEffect(() => {
    if (viewMode === "kanban") {
      // Fetch statuses first, then emails to ensure consistency
      fetchKanbanStatuses().then(() => {
        fetchKanbanEmails();
      });
    }
  }, [viewMode, fetchKanbanStatuses, fetchKanbanEmails]);

  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(
    new Set(),
  );

  // Custom Hooks
  const { sidebarWidth, listWidth, startResizingSidebar, startResizingList } =
    useResizableLayout();
  const {
    handleToggleRead,
    handleToggleStar,
    handleDeleteEmail,
    handleMoveToInbox,
    handlePermanentlyDelete,
    refreshMessages,
    handleBulkDelete,
    handleBulkMarkRead,
    handleSnoozeEmail,
  } = useEmailActions();

  // Keyboard Navigation Hook (List view only)
  useKeyboardNavigation({
    messages,
    selectedMessage,
    onSelectMessage: (message) => {
      dispatch(setSelectedMessage(message));
      // Mark as read when selecting via keyboard
      if (message && !message.isRead) {
        handleToggleRead(message.id, false);
      }
    },
    onNavigate: (emailId) => {
      // Update URL to reflect current selection
      if (emailId) {
        navigate(`?email=${emailId}`, { replace: true });
      } else {
        navigate("", { replace: true });
      }
    },
    onDeleteMessage: handleDeleteEmail,
    onToggleStar: handleToggleStar,
    onFocusSearch: () => {
      const searchInput = document.querySelector(
        'input[placeholder="Search mail"]',
      ) as HTMLInputElement;
      searchInput?.focus();
    },
    enabled:
      viewMode === "list" &&
      !isSearchActive &&
      !isComposeOpen &&
      !showShortcutsModal,
  });

  // Listen for ? key to TOGGLE shortcuts modal, and Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTyping =
        active?.tagName === "INPUT" || active?.tagName === "TEXTAREA";

      // ? to toggle modal
      if (e.key === "?" && !isTyping) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      }

      // Esc to close modal
      if (e.key === "Escape" && showShortcutsModal) {
        e.preventDefault();
        setShowShortcutsModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showShortcutsModal]);

  const handleUnsnoozeEmail = useCallback(
    async (emailId: string) => {
      try {
        await gmailService.unsnoozeEmail(emailId);
        // Refresh messages and snoozed info
        if (selectedLabel) {
          refreshMessages(selectedLabel.id);
        }
        // Invalidate INBOX cache since email moves back to INBOX
        if (user?.email) {
          const { indexedDBService } =
            await import("../services/indexedDBService");
          indexedDBService
            .invalidateLabelCache(user.email, "INBOX")
            .catch(console.error);
        }
        fetchSnoozedInfo();
      } catch (error) {
        console.error("Failed to unsnooze email", error);
      }
    },
    [selectedLabel, refreshMessages, fetchSnoozedInfo, user?.email],
  );

  const sidebarRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.email) {
      dispatch(fetchLabels(user.email));
    }
  }, [dispatch, user?.email]);

  // Handle URL parameter for selected email (URL is single source of truth)
  useEffect(() => {
    const emailId = searchParams.get("email");
    if (emailId && messages.length > 0) {
      const message = messages.find((m) => m.id === emailId);
      if (message && (!selectedMessage || selectedMessage.id !== emailId)) {
        dispatch(setSelectedMessage(message));
        // Mark as read if unread
        if (!message.isRead) {
          handleToggleRead(message.id, false);
        }
      }
    } else if (!emailId && selectedMessage) {
      // Clear selected message when URL has no email param (e.g., after ESC)
      dispatch(setSelectedMessage(null));
    }
  }, [
    searchParams,
    messages,
    selectedMessage,
    dispatch,
    isMobile,
    handleToggleRead,
  ]);

  // Fetch snoozed info when SNOOZED label is selected
  useEffect(() => {
    if (selectedLabel?.name === "SNOOZED") {
      fetchSnoozedInfo();
    }
  }, [selectedLabel, fetchSnoozedInfo]);

  useEffect(() => {
    if (!selectedLabel && labels.length > 0) {
      const inbox = labels.find((l: GmailLabel) => l.id === "INBOX");
      if (inbox) {
        dispatch(setSelectedLabel(inbox));
      }
    }
  }, [labels, selectedLabel, dispatch]);

  useEffect(() => {
    if (selectedLabel && user?.email) {
      dispatch(clearMessages());
      setPageToken(undefined);
      setHistoryStack([]);
      setSelectedEmailIds(new Set());
      dispatch(
        fetchMessages({ labelId: selectedLabel.id, userEmail: user.email }),
      );
    }
  }, [selectedLabel, dispatch, user?.email]);

  const toggleEmailSelection = useCallback((id: string) => {
    setSelectedEmailIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleNextPage = () => {
    if (nextPageToken && selectedLabel && user?.email) {
      setHistoryStack((prev) => [...prev, pageToken || ""]);
      setPageToken(nextPageToken);
      dispatch(
        fetchMessages({
          labelId: selectedLabel.id,
          pageToken: nextPageToken,
          userEmail: user.email,
        }),
      );
    }
  };

  const handlePrevPage = () => {
    if (historyStack.length > 0 && selectedLabel && user?.email) {
      const prevToken = historyStack[historyStack.length - 1];
      const newStack = historyStack.slice(0, -1);
      setHistoryStack(newStack);
      setPageToken(prevToken === "" ? undefined : prevToken);
      dispatch(
        fetchMessages({
          labelId: selectedLabel.id,
          pageToken: prevToken === "" ? undefined : prevToken,
          userEmail: user.email,
        }),
      );
    }
  };

  const handleLabelClick = (label: GmailLabel) => {
    dispatch(setSelectedLabel(label));
    setIsMobileDetailView(false);
  };

  const handleMessageClick = (message: ParsedEmail) => {
    dispatch(setSelectedMessage(message));

    // Update URL with email ID
    navigate(`?email=${message.id}`, { replace: true });

    // On mobile, switch to detail view
    if (isMobile) {
      setIsMobileDetailView(true);
    }

    // Mark as read if unread
    if (!message.isRead) {
      handleToggleRead(message.id, false);
    }
  };

  const handleBackToKanban = useCallback(() => {
    setIsMobileDetailView(false);
    dispatch(setSelectedMessage(null));
  }, [dispatch]);

  // handleKanbanUpdateStatus removed

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Toaster position="bottom-center" />
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex-shrink-0 z-50 select-none">
        <div className="h-full px-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Left Section - Logo & Title */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-10 h-10 rounded-lg shadow-md"
            />
            <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">
              {viewMode === "kanban" ? "Next Gmail" : "Next Gmail"}
            </h1>
          </div>

          {/* Center Section - Search & View Toggle (fixed position) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="w-[500px]">
              <SearchPanel
                onSearchResults={(results) => {
                  setSearchResults(results);
                  setIsSearchActive(true);
                  // Clear selected message and URL when search activates
                  dispatch(setSelectedMessage(null));
                  navigate("", { replace: true });
                }}
                onSearchRequest={(request) => {
                  setSearchRequest(request);
                }}
                onClearSearch={() => {
                  setSearchResults([]);
                  setIsSearchActive(false);
                  setSearchRequest({});
                  // Clear selected message when exiting search
                  dispatch(setSelectedMessage(null));
                  navigate("", { replace: true });
                }}
                isSearchActive={isSearchActive}
              />
            </div>

            {/* View Toggle - Text Style */}
            <div className="flex bg-blue-50 p-1 rounded-lg border border-blue-200 flex-shrink-0">
              <button
                onClick={() => setViewMode("list")}
                className={`px-6 py-2 rounded-md transition-all flex items-center justify-center font-medium text-sm ${viewMode === "list"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-blue-600 hover:text-blue-700"
                  }`}
                title="List View"
              >
                Gmail
              </button>
              <button
                onClick={() => {
                  setViewMode("kanban");
                  setIsMobileDetailView(false);
                  dispatch(setSelectedMessage(null));
                }}
                className={`px-6 py-2 rounded-md transition-all flex items-center justify-center font-medium text-sm ${viewMode === "kanban"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-blue-600 hover:text-blue-700"
                  }`}
                title="Kanban Board"
              >
                Kanban
              </button>
            </div>
          </div>

          {/* Right Section - User & Logout */}
          <div className="flex items-center gap-4 justify-end">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700 overflow-hidden">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.name?.[0] || "U"
                )}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden md:block">
                {user?.name || "User"}
              </span>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={() => dispatch(logout())}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between">
          <p className="text-red-800 text-sm">{error}</p>
          <button className="text-red-600 hover:text-red-800">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {viewMode === "list" ? (
          <>
            <EmailSidebar
              sidebarWidth={sidebarWidth}
              isMobileDetailView={
                isMobile && (isMobileDetailView || !!selectedMessage)
              }
              labels={labels}
              selectedLabel={selectedLabel}
              isLoading={isLoading}
              onLabelClick={handleLabelClick}
              sidebarRef={sidebarRef}
              onCompose={() => setIsComposeOpen(true)}
              onShowShortcuts={() => setShowShortcutsModal(true)}
            />

            <div
              className="w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-20 hidden md:block select-none"
              onMouseDown={startResizingSidebar}
            />

            {isSearchActive ? (
              <SearchResults
                results={searchResults}
                searchQuery={searchRequest.body || ""}
                onSelectResult={async (messageId) => {
                  try {
                    const message = await gmailService.getMessage(messageId);
                    dispatch(setSelectedMessage(message));
                    // Update URL with email ID so it persists (URL is source of truth)
                    navigate(`?email=${messageId}`, { replace: true });
                    if (isMobile) setIsMobileDetailView(true);
                  } catch (e) {
                    console.error("Failed to load message", e);
                  }
                }}
                onBack={() => {
                  setIsSearchActive(false);
                  setSearchResults([]);
                  // Clear selected message when going back from search
                  dispatch(setSelectedMessage(null));
                  navigate("", { replace: true });
                }}
              />
            ) : (
              <EmailList
                listWidth={listWidth}
                isMobileDetailView={isMobileDetailView}
                messages={messages}
                selectedMessage={selectedMessage}
                selectedLabel={selectedLabel}
                isLoading={isLoading}
                searchQuery=""
                onRefresh={() =>
                  selectedLabel && refreshMessages(selectedLabel.id)
                }
                onMessageClick={handleMessageClick}
                listRef={listRef}
                onToggleStar={handleToggleStar}
                onDelete={handleDeleteEmail}
                selectedIds={selectedEmailIds}
                onToggleSelection={toggleEmailSelection}
                onBulkDelete={(ids) => {
                  handleBulkDelete(ids);
                  setSelectedEmailIds(new Set());
                }}
                onBulkMarkRead={(ids, isRead) => {
                  handleBulkMarkRead(ids, isRead);
                  setSelectedEmailIds(new Set());
                }}
                onClearSelection={() => setSelectedEmailIds(new Set())}
                onNextPage={handleNextPage}
                onPrevPage={handlePrevPage}
                hasNextPage={!!nextPageToken}
                hasPrevPage={historyStack.length > 0}
                onSnooze={(emailId, snoozedUntil) => {
                  if (selectedLabel) {
                    handleSnoozeEmail(emailId, snoozedUntil, selectedLabel.id);
                  }
                }}
                snoozedInfo={snoozedInfo}
                onUnsnooze={handleUnsnoozeEmail}
                onMoveToInbox={(emailId) => {
                  if (selectedLabel) {
                    dispatch(setSelectedMessage(null));
                    navigate("", { replace: true });
                    handleMoveToInbox(emailId, selectedLabel.id);
                  }
                }}
                onPermanentlyDelete={(emailId) => {
                  if (selectedLabel) {
                    dispatch(setSelectedMessage(null));
                    navigate("", { replace: true });
                    handlePermanentlyDelete(emailId, selectedLabel.id);
                  }
                }}
              />
            )}

            <div
              className="w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-20 hidden md:block select-none"
              onMouseDown={startResizingList}
            />

            <EmailDetail
              isMobileDetailView={
                isMobile && (isMobileDetailView || !!selectedMessage)
              }
              setIsMobileDetailView={setIsMobileDetailView}
              selectedMessage={selectedMessage}
              isLoading={isLoading}
              selectedLabel={selectedLabel}
              onToggleStar={handleToggleStar}
              onToggleRead={handleToggleRead}
              onDelete={handleDeleteEmail}
              onMoveToInbox={(emailId) => {
                if (selectedLabel) {
                  dispatch(setSelectedMessage(null));
                  // Clear URL parameter to prevent useEffect from restoring selected message
                  navigate("", { replace: true });
                  handleMoveToInbox(emailId, selectedLabel.id);
                }
              }}
              onPermanentlyDelete={(emailId) => {
                if (selectedLabel) {
                  // Clear selected message FIRST to ensure immediate UI update
                  dispatch(setSelectedMessage(null));
                  // Clear URL parameter to prevent useEffect from restoring selected message
                  navigate("", { replace: true });
                  handlePermanentlyDelete(emailId, selectedLabel.id);
                }
              }}
            />
          </>
        ) : (
          <>
            {isMobile &&
              (isMobileDetailView || !!selectedMessage) &&
              selectedMessage ? (
              <EmailDetail
                isMobileDetailView={isMobileDetailView}
                setIsMobileDetailView={setIsMobileDetailView}
                selectedMessage={selectedMessage}
                isLoading={isLoading}
                selectedLabel={selectedLabel}
                onToggleStar={handleToggleStar}
                onToggleRead={handleToggleRead}
                onDelete={handleDeleteEmail}
                onMoveToInbox={(emailId) => {
                  if (selectedLabel) {
                    dispatch(setSelectedMessage(null));
                    navigate("", { replace: true });
                    handleMoveToInbox(emailId, selectedLabel.id);
                  }
                }}
                onPermanentlyDelete={(emailId) => {
                  if (selectedLabel) {
                    dispatch(setSelectedMessage(null));
                    navigate("", { replace: true });
                    handlePermanentlyDelete(emailId, selectedLabel.id);
                  }
                }}
                onBack={handleBackToKanban}
              />
            ) : (
              <div className="w-full h-full">
                <KanbanView
                  messages={kanbanMessages}
                  isLoading={kanbanLoading}
                  labels={labels}
                  kanbanStatuses={kanbanStatuses}
                  onMessageClick={handleMessageClick}
                  onToggleStar={handleToggleStar}
                  onSnooze={(emailId, snoozedUntil) => {
                    if (selectedLabel) {
                      handleSnoozeEmail(
                        emailId,
                        snoozedUntil,
                        selectedLabel.id,
                      );
                    }
                  }}
                  onLoadMore={fetchKanbanEmails}
                  onMessagesChange={handleKanbanMessagesChange}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Compose Email Modal */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};

export default EmailDashboard;
