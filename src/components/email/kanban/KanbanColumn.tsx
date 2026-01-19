import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { ParsedEmail, GmailLabel } from "../../../types/gmail";
import {
  SlidersHorizontal,
  Mail,
  Paperclip,
  Sparkles,
  Tag,
  Check,
  X,
  Trash2,
} from "lucide-react";
import KanbanCard from "./KanbanCard";

interface KanbanColumnProps {
  id: string; // Changed from literal union to string for dynamic columns
  title: string;
  count: number;
  icon?: React.ElementType | null; // Made optional
  emails: ParsedEmail[];
  labels: GmailLabel[];
  summariesById: Record<string, string>;
  loadingIds: Set<string>;
  onSnooze: (email: ParsedEmail) => void;
  onDropEmail: (emailId: string, targetColumn: string) => void; // Changed to string
  onMessageClick: (message: ParsedEmail) => void;
  onCardVisible: (emailId: string) => void;
  onShowSummaryModal: (email: ParsedEmail) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>, columnId: string) => void;
  color?: string; // Added color prop
  isDefault?: boolean; // Added to check if column can be deleted
  onDelete?: (columnId: string) => void; // Added delete callback
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  count,
  icon: Icon,
  emails,
  labels,
  summariesById,
  loadingIds,
  onSnooze,
  onDropEmail,
  onMessageClick,
  onCardVisible,
  onShowSummaryModal,
  onScroll,
  color,
  isDefault = false,
  onDelete,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Column-specific sort/filter state
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterAttachments, setFilterAttachments] = useState(false);
  const [showAiSummary, setShowAiSummary] = useState(true);
  const [filterLabels, setFilterLabels] = useState<Set<string>>(new Set());

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check both the trigger button (dropdownRef) and the content (dropdownContentRef)
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownContentRef.current &&
        !dropdownContentRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate dropdown position
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (showDropdown && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 5,
        left: rect.right - 240, // Increased width for better label display (w-60)
      });
    }
  }, [showDropdown]);

  // Handle scroll to close dropdown (BUT ignore if scrolling inside the dropdown itself)
  useEffect(() => {
    const handleScroll = (e: Event) => {
      if (!showDropdown) return;

      // If scrolling happens inside the dropdown content, DO NOT close
      if (
        dropdownContentRef.current &&
        dropdownContentRef.current.contains(e.target as Node)
      ) {
        return;
      }

      // Otherwise (scrolling the page or kanban column), close it
      setShowDropdown(false);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [showDropdown]);

  // Get available labels in this column for filtering
  // For Kanban workflow, only show IMPORTANT label as filter option
  const availableLabels = useMemo(() => {
    const labelIdsInColumn = new Set<string>();
    emails.forEach((e) =>
      e.labelIds?.forEach((id) => labelIdsInColumn.add(id)),
    );

    // Only show IMPORTANT label for Kanban filtering
    return labels.filter(
      (l) => labelIdsInColumn.has(l.id) && l.id === "IMPORTANT",
    );
  }, [emails, labels]);

  // Apply filters and sorting
  const filteredAndSortedEmails = React.useMemo(() => {
    let result = [...emails];

    // Apply filters
    if (filterUnread) {
      result = result.filter((e) => !e.isRead);
    }
    if (filterAttachments) {
      result = result.filter((e) => e.attachments && e.attachments.length > 0);
    }
    if (filterLabels.size > 0) {
      result = result.filter((e) =>
        e.labelIds?.some((id) => filterLabels.has(id)),
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [emails, filterUnread, filterAttachments, filterLabels, sortOrder]);

  const hasActiveFilter =
    filterUnread || filterAttachments || filterLabels.size > 0;
  const activeFilterCount =
    (filterUnread ? 1 : 0) + (filterAttachments ? 1 : 0) + filterLabels.size;

  const toggleLabelFilter = (labelId: string) => {
    setFilterLabels((prev) => {
      const next = new Set(prev);
      if (next.has(labelId)) {
        next.delete(labelId);
      } else {
        next.add(labelId);
      }
      return next;
    });
  };

  const getLabelName = (label: GmailLabel) => {
    if (label.id === "IMPORTANT") return "Important";
    if (label.id.startsWith("CATEGORY_")) {
      return (
        label.name.charAt(0).toUpperCase() + label.name.slice(1).toLowerCase()
      );
    }
    return label.name;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const emailId = e.dataTransfer.getData("emailId");
    if (emailId) {
      onDropEmail(emailId, id);
    }
  };

  const handleDragStart = (e: React.DragEvent, emailId: string) => {
    e.dataTransfer.setData("emailId", emailId);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className={`flex flex-col h-full w-full overflow-hidden rounded-md border transition-colors duration-200 ${isDraggingOver ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-100" : "bg-slate-50/50 border-slate-100"}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header with color accent */}
      <div
        className="p-3 flex items-center justify-between border-b bg-white/50 backdrop-blur-sm flex-shrink-0 rounded-t-md"
        style={{
          borderBottomColor: color || "#e2e8f0",
          borderBottomWidth: "3px",
        }}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={18} style={{ color: color || "#64748b" }} />}
          <h2
            className="font-bold text-sm uppercase tracking-wide"
            style={{ color: color || "#1e293b" }}
          >
            {title}
          </h2>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: color ? `${color}20` : "#e2e8f0",
              color: color || "#475569",
            }}
          >
            {hasActiveFilter
              ? `${filteredAndSortedEmails.length}/${count}`
              : count}
          </span>
        </div>

        {/* Actions: Sort/Filter and Delete */}
        <div className="flex items-center gap-1">
          {/* Sort/Filter Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className={`p-1.5 rounded-md transition-colors ${
                hasActiveFilter || sortOrder !== "newest"
                  ? "bg-indigo-100 text-indigo-700"
                  : "hover:bg-slate-100 text-slate-500"
              }`}
              title="Sort & Filter"
            >
              <SlidersHorizontal size={14} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {showDropdown &&
              createPortal(
                <div
                  ref={dropdownContentRef}
                  className="fixed bg-white rounded-lg shadow-xl border border-slate-200 z-[9999] w-60 max-h-[80vh] overflow-y-auto"
                  style={{ top: dropdownPos.top, left: dropdownPos.left }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {/* Sort Section */}
                  <div className="p-2 border-b border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-2 px-2">
                      Sort by
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSortOrder("newest")}
                        className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors text-center ${
                          sortOrder === "newest"
                            ? "bg-indigo-50 text-indigo-700 font-medium"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Newest
                      </button>
                      <button
                        onClick={() => setSortOrder("oldest")}
                        className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors text-center ${
                          sortOrder === "oldest"
                            ? "bg-indigo-50 text-indigo-700 font-medium"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Oldest
                      </button>
                    </div>
                  </div>

                  {/* View Options */}
                  <div className="p-2 border-b border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-2 px-2">
                      View
                    </div>
                    <button
                      onClick={() => setShowAiSummary(!showAiSummary)}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-md hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-slate-700">
                        <Sparkles
                          size={14}
                          className={
                            showAiSummary ? "text-indigo-500" : "text-slate-400"
                          }
                        />
                        <span>AI Summary</span>
                      </div>
                      <div
                        className={`w-8 h-4 rounded-full relative transition-colors ${showAiSummary ? "bg-indigo-500" : "bg-slate-300"}`}
                      >
                        <div
                          className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showAiSummary ? "left-4.5" : "left-0.5"}`}
                          style={{ left: showAiSummary ? "18px" : "2px" }}
                        />
                      </div>
                    </button>
                  </div>

                  {/* Filter Section */}
                  <div className="p-2">
                    <div className="flex items-center justify-between px-2 mb-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase">
                        Filter
                      </span>
                      {hasActiveFilter && (
                        <button
                          onClick={() => {
                            setFilterUnread(false);
                            setFilterAttachments(false);
                            setFilterLabels(new Set());
                          }}
                          className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                        >
                          <X size={10} /> Clear
                        </button>
                      )}
                    </div>

                    {/* Basic Filters */}
                    <div className="space-y-1 mb-3">
                      <label className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterUnread}
                          onChange={(e) => setFilterUnread(e.target.checked)}
                          className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded"
                        />
                        <Mail size={14} className="text-slate-500" />
                        <span className="text-sm text-slate-700">Unread</span>
                      </label>
                      <label className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterAttachments}
                          onChange={(e) =>
                            setFilterAttachments(e.target.checked)
                          }
                          className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded"
                        />
                        <Paperclip size={14} className="text-slate-500" />
                        <span className="text-sm text-slate-700">
                          Attachments
                        </span>
                      </label>
                    </div>

                    {/* Label Filters */}
                    {availableLabels.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-2 px-2 mt-2">
                          By Label
                        </div>
                        <div className="max-h-32 overflow-y-auto px-1 space-y-0.5">
                          {availableLabels.map((label) => (
                            <button
                              key={label.id}
                              onClick={() => toggleLabelFilter(label.id)}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                                filterLabels.has(label.id)
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                                  filterLabels.has(label.id)
                                    ? "bg-indigo-600 border-indigo-600"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {filterLabels.has(label.id) && (
                                  <Check size={10} className="text-white" />
                                )}
                              </div>
                              <Tag
                                size={12}
                                className={
                                  filterLabels.has(label.id)
                                    ? "text-indigo-500"
                                    : "text-slate-400"
                                }
                              />
                              <span className="truncate flex-1 text-left">
                                {getLabelName(label)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>,
                document.body,
              )}
          </div>

          {/* Delete Button (only for non-default columns) */}
          {!isDefault && onDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-md transition-colors hover:bg-red-50 text-slate-500 hover:text-red-600"
              title="Delete column"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div
        className="p-3 flex-1 overflow-y-auto overflow-x-hidden min-h-0 kanban-column-scroll rounded-b-md"
        onScroll={onScroll ? (e) => onScroll(e, id) : undefined}
      >
        {filteredAndSortedEmails.map((email) => (
          <KanbanCard
            key={email.id}
            email={email}
            column={id}
            allLabels={labels}
            summaryText={summariesById[email.id]}
            isLoadingSummary={loadingIds.has(email.id)}
            onSnooze={onSnooze}
            onDragStart={handleDragStart}
            onMessageClick={onMessageClick}
            onVisible={onCardVisible}
            onShowSummaryModal={onShowSummaryModal}
            showAiSummary={showAiSummary}
          />
        ))}
        {filteredAndSortedEmails.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center border-2 border-dashed border-slate-100 rounded-lg">
            {hasActiveFilter ? (
              <>
                <p className="text-sm font-medium">No matching items</p>
                <p className="text-xs mt-1 text-slate-400">
                  Try clearing filters
                </p>
              </>
            ) : (
              <p className="text-sm font-medium">No items</p>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-md">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Column
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete "{title}"?
              {count > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  This column has {count} email{count !== 1 ? "s" : ""}. Please
                  move them first.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (count === 0 && onDelete) {
                    onDelete(id);
                    setShowDeleteConfirm(false);
                  }
                }}
                disabled={count > 0}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                  count > 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanColumn;
