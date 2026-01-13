import React, { useState } from 'react';
import { ParsedEmail, GmailLabel } from '../../types/gmail';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchUserProfiles } from '../../store/slices/gmailSlice';
import { RefreshCw, Mail, Loader2, Star, Trash2, Paperclip, Square, CheckSquare, MailOpen, MinusSquare, Clock, BellOff, Inbox, AlertTriangle } from 'lucide-react';
import EmailContextMenu from './EmailContextMenu';
import SnoozeDatePicker from './SnoozeDatePicker';
import UserAvatar from '../common/UserAvatar';
import ConfirmationModal from '../common/ConfirmationModal';

interface EmailListProps {
  listWidth: number;
  isMobileDetailView: boolean;
  messages: ParsedEmail[];
  selectedMessage: ParsedEmail | null;
  selectedLabel: GmailLabel | null;
  isLoading: boolean;
  searchQuery: string;
  onRefresh: () => void;
  onMessageClick: (message: ParsedEmail) => void;
  listRef: React.RefObject<HTMLDivElement | null>;
  onToggleStar: (id: string, isStarred: boolean) => void;
  onDelete: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkMarkRead: (ids: string[], isRead: boolean) => void;
  onClearSelection: () => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onSnooze: (emailId: string, snoozedUntil: string) => void;
  snoozedInfo?: Record<string, string>;
  onUnsnooze?: (emailId: string) => void;
  onMoveToInbox?: (emailId: string) => void;
  onPermanentlyDelete?: (emailId: string) => void;
}

const EmailList: React.FC<EmailListProps> = ({
  listWidth,
  isMobileDetailView,
  messages,
  selectedMessage,
  selectedLabel,
  isLoading,
  searchQuery,
  onRefresh,
  onMessageClick,
  listRef,
  onToggleStar,
  onDelete,
  selectedIds,
  onToggleSelection,
  onBulkDelete,
  onBulkMarkRead,
  onClearSelection,
  onNextPage,
  onPrevPage,
  hasNextPage,
  hasPrevPage,
  onSnooze,
  snoozedInfo,
  onUnsnooze,
  onMoveToInbox,
  onPermanentlyDelete
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; emailId: string } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedEmailForSnooze, setSelectedEmailForSnooze] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; ids: string[]; isBulk: boolean }>({ show: false, ids: [], isBulk: false });
  const dispatch = useAppDispatch();
  const { knownUsers } = useAppSelector(state => state.gmail);
  const isInTrash = selectedLabel?.id === 'TRASH';
  const isInSpam = selectedLabel?.id === 'SPAM';
  const isInSnoozed = selectedLabel?.name === 'SNOOZED';
  const isInSent = selectedLabel?.id === 'SENT';
  const isInDraft = selectedLabel?.id === 'DRAFT';
  // Hide star in Trash, Spam, Sent, Draft
  const showStarButton = !isInTrash && !isInSpam && !isInSent && !isInDraft;

  const formatSnoozeUntil = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (date < tomorrow) {
      return `Today ${timeStr}`;
    } else if (date < dayAfterTomorrow) {
      return `Tomorrow ${timeStr}`;
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ` ${timeStr}`;
    }
  };

  React.useEffect(() => {
    if (messages.length > 0) {
      const uniqueSenders = Array.from(new Set(messages.map(msg => {
        const match = msg.from.match(/<(.+)>/);
        return match ? match[1] : msg.from;
      })));

      const unknownEmails = uniqueSenders.filter(email => !knownUsers?.[email]);

      if (unknownEmails.length > 0) {
        dispatch(fetchUserProfiles(unknownEmails));
      }
    }
  }, [messages, dispatch, knownUsers]);

  const extractEmail = (emailString: string) => {
    const match = emailString.match(/<(.+)>/);
    return match ? match[1] : emailString;
  };

  const extractName = (emailString: string) => {
    const match = emailString.match(/^"?([^"<]+)"?\s*</);
    return match ? match[1].trim() : emailString.split('@')[0];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredMessages = messages.filter(msg =>
    msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort snoozed emails by snoozeUntil time (earliest first)
  const sortedMessages = isInSnoozed && snoozedInfo
    ? [...filteredMessages].sort((a, b) => {
      const aTime = snoozedInfo[a.id] ? new Date(snoozedInfo[a.id]).getTime() : Infinity;
      const bTime = snoozedInfo[b.id] ? new Date(snoozedInfo[b.id]).getTime() : Infinity;
      return aTime - bTime;
    })
    : filteredMessages;

  // Determine bulk action state based on the first selected item
  const firstSelectedMessage = filteredMessages.find(msg => selectedIds.has(msg.id));
  const isFirstSelectedRead = firstSelectedMessage?.isRead ?? false;

  return (
    <div
      ref={listRef}
      className={`bg-white border-r border-gray-200 flex flex-col flex-shrink-0 ${isMobileDetailView ? 'hidden md:flex' : 'flex'} w-full md:w-[var(--list-width)]`}
      style={{ '--list-width': `${listWidth}px` } as React.CSSProperties}
    >
      <div className="border-b border-gray-200 p-4 flex-shrink-0 bg-white z-10 h-auto min-h-[64px] flex flex-col justify-center">
        {selectedIds.size > 0 ? (
          // Bulk Action Toolbar
          <div className="flex flex-col h-full justify-center gap-3">
            <div className="flex items-center justify-between bg-blue-50 p-2 rounded-lg border border-blue-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClearSelection}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  title="Clear selection"
                >
                  <MinusSquare size={20} />
                </button>
                <span className="font-semibold text-blue-900 text-sm">{selectedIds.size} selected</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onBulkMarkRead(Array.from(selectedIds), !isFirstSelectedRead)}
                  className="p-2 hover:bg-blue-100 rounded text-blue-700 transition-colors"
                  title={isFirstSelectedRead ? 'Mark as Unread' : 'Mark as Read'}
                >
                  {isFirstSelectedRead ? <Mail size={18} /> : <MailOpen size={18} />}
                </button>
                {/* Move to Inbox for Trash/Spam */}
                {(isInTrash || isInSpam) && onMoveToInbox && (
                  <button
                    onClick={() => {
                      Array.from(selectedIds).forEach(id => onMoveToInbox(id));
                      onClearSelection();
                    }}
                    className="p-2 hover:bg-green-100 rounded text-green-600 transition-colors"
                    title={isInSpam ? 'Not Spam' : 'Move to Inbox'}
                  >
                    <Inbox size={18} />
                  </button>
                )}
                {/* Delete/Permanently Delete */}
                {isInTrash || isInSpam ? (
                  onPermanentlyDelete && (
                    <button
                      onClick={() => {
                        setDeleteConfirm({ show: true, ids: Array.from(selectedIds), isBulk: true });
                      }}
                      className="p-2 hover:bg-red-100 rounded text-red-600 transition-colors"
                      title="Delete Forever"
                    >
                      <AlertTriangle size={18} />
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => onBulkDelete(Array.from(selectedIds))}
                    className="p-2 hover:bg-red-100 rounded text-red-600 transition-colors"
                    title="Delete selected"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500 text-center">
              Select more or perform action
            </div>
          </div>
        ) : (
          // Standard Search Toolbar
          <>
            <div className="flex items-center justify-between w-full">
              <h2 className="text-sm font-bold text-gray-900 truncate pr-2">{selectedLabel?.name || 'Select a folder'}</h2>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">{filteredMessages.length} emails</span>
                <button
                  onClick={onRefresh}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={18} className="text-gray-600" />
                </button>
              </div>
            </div>


          </>
        )}
      </div>

      <div
        className="flex-1 overflow-y-auto custom-scrollbar select-none"
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4 text-center">
            <Mail size={48} className="mb-3 opacity-50" />
            <p>No data available</p>
          </div>
        ) : (
          <>
            {sortedMessages?.map(message => (
              <div
                key={message.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, emailId: message.id });
                }}
                onClick={() => onMessageClick(message)}
                className={`border-b border-gray-100 p-4 group cursor-pointer ${selectedMessage?.id === message.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                  } ${!message.isRead ? 'bg-white' : 'bg-gray-50/50'} ${selectedIds.has(message.id) ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                    {/* Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelection(message.id);
                      }}
                      className="p-1 hover:bg-gray-200 rounded flex-shrink-0 text-gray-400 hover:text-gray-600"
                    >
                      {selectedIds.has(message.id) ? (
                        <CheckSquare size={18} className="text-blue-600" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>

                    {showStarButton && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(message.id, message.isStarred);
                        }}
                        className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                        title={message.isStarred ? 'Remove star' : 'Add star'}
                      >
                        <Star size={16} className={message.isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'} />
                      </button>
                    )}

                    {/* Avatar - prevent shrinking */}
                    <div className="flex-shrink-0">
                      <UserAvatar
                        email={extractEmail(message.from)}
                        name={extractName(message.from)}
                        size="w-8 h-8"
                        className="mr-1"
                      />
                    </div>

                    <span
                      className={`text-sm truncate cursor-pointer ${!message.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                      onClick={() => onMessageClick(message)}
                    >
                      {extractName(message.from)}
                    </span>
                  </div>
                  {/* Fixed width for date/actions to prevent layout shift */}
                  <div className="flex items-center justify-end gap-1 w-[85px] flex-shrink-0">
                    <span className={`text-xs mr-1 truncate w-full text-right ${!message.isRead ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                      {formatDate(message.date)}
                    </span>
                    {/* Action buttons based on label */}
                    {selectedIds.size === 0 && (
                      <>
                        {/* Move to Inbox for Trash/Spam */}
                        {(isInTrash || isInSpam) && onMoveToInbox && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveToInbox(message.id);
                            }}
                            className="p-1.5 hover:bg-green-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title={isInSpam ? 'Not Spam' : 'Move to Inbox'}
                          >
                            <Inbox size={16} className="text-gray-400 hover:text-green-600" />
                          </button>
                        )}
                        {/* Delete/Permanently Delete */}
                        {isInTrash || isInSpam ? (
                          onPermanentlyDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ show: true, ids: [message.id], isBulk: false });
                              }}
                              className="p-1.5 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete Forever"
                            >
                              <AlertTriangle size={16} className="text-gray-400 hover:text-red-600" />
                            </button>
                          )
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(message.id);
                            }}
                            className="p-1.5 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-gray-400 hover:text-red-600" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div
                  className={`text-sm mb-1 truncate cursor-pointer ${!message.isRead ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                  onClick={() => onMessageClick(message)}
                >
                  {message.subject || '(No Subject)'}
                </div>

                <p className="text-xs text-gray-500 truncate line-clamp-1">{message.snippet}</p>

                {/* Snooze Info for SNOOZED label */}
                {isInSnoozed && snoozedInfo && snoozedInfo[message.id] && (
                  <div className="flex items-center justify-between mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-amber-600" />
                      <span className="text-xs text-amber-700">
                        Snoozed until <b>{formatSnoozeUntil(snoozedInfo[message.id])}</b>
                      </span>
                    </div>
                    {onUnsnooze && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnsnooze(message.id);
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded transition-colors"
                        title="Unsnooze now"
                      >
                        <BellOff size={12} />
                        Unsnooze
                      </button>
                    )}
                  </div>
                )}

                {message.attachments.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Paperclip size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500">{message.attachments.length} attachment(s)</span>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination Controls */}
            <div className="p-4 flex items-center justify-between border-t border-gray-200 bg-gray-50">
              <button
                onClick={onPrevPage}
                disabled={!hasPrevPage || isLoading}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${!hasPrevPage || isLoading
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-200 bg-white border border-gray-300'
                  }`}
              >
                Previous
              </button>
              <button
                onClick={onNextPage}
                disabled={!hasNextPage || isLoading}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${!hasNextPage || isLoading
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-200 bg-white border border-gray-300'
                  }`}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <EmailContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onSnooze={(option) => {
            setSelectedEmailForSnooze(contextMenu.emailId);
            if (option === 'custom') {
              setShowDatePicker(true);
            } else {
              // Calculate snooze time based on preset
              const now = new Date();
              let snoozeDate: Date;

              switch (option) {
                case 'later-today':
                  snoozeDate = new Date(now);
                  snoozeDate.setHours(18, 0, 0, 0);
                  if (snoozeDate <= now) snoozeDate.setDate(snoozeDate.getDate() + 1);
                  break;
                case 'tomorrow':
                  snoozeDate = new Date(now);
                  snoozeDate.setDate(snoozeDate.getDate() + 1);
                  snoozeDate.setHours(9, 0, 0, 0);
                  break;
                case 'weekend': {
                  snoozeDate = new Date(now);
                  const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
                  snoozeDate.setDate(snoozeDate.getDate() + daysUntilSaturday);
                  snoozeDate.setHours(9, 0, 0, 0);
                  break;
                }
                case 'next-week': {
                  snoozeDate = new Date(now);
                  const daysUntilMonday = (1 - now.getDay() + 7) % 7 || 7;
                  snoozeDate.setDate(snoozeDate.getDate() + daysUntilMonday);
                  snoozeDate.setHours(9, 0, 0, 0);
                  break;
                }
                default:
                  return;
              }

              onSnooze(contextMenu.emailId, snoozeDate.toISOString());
            }
          }}
        />
      )}

      {/* Date Picker Modal */}
      {showDatePicker && selectedEmailForSnooze && (
        <SnoozeDatePicker
          onConfirm={(dateTime) => {
            onSnooze(selectedEmailForSnooze, dateTime);
            setShowDatePicker(false);
            setSelectedEmailForSnooze(null);
          }}
          onClose={() => {
            setShowDatePicker(false);
            setSelectedEmailForSnooze(null);
          }}
        />
      )}

      {/* Delete Forever Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, ids: [], isBulk: false })}
        onConfirm={() => {
          if (onPermanentlyDelete) {
            deleteConfirm.ids.forEach(id => onPermanentlyDelete(id));
            if (deleteConfirm.isBulk) {
              onClearSelection();
            }
          }
        }}
        title="Delete Forever?"
        message={deleteConfirm.isBulk
          ? `${deleteConfirm.ids.length} email(s) will be permanently deleted. This action cannot be undone.`
          : "This email will be permanently deleted. This action cannot be undone."
        }
        confirmText="Delete Forever"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default EmailList;
