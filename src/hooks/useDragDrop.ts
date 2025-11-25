import { useState } from 'react';
import type { Email } from '../types';

/**
 * Custom hook quản lý drag & drop state
 * - Drag over state
 * - Drop handlers
 */
export const useDragDrop = (
  onDropEmail: (emailId: string, targetColumn: Email['column']) => void,
  onReorderEmails: (draggedId: string, hoveredId: string, column: Email['column']) => void,
  columnId: Email['column']
) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dragOverEmailId, setDragOverEmailId] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
      setDragOverEmailId(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    setDragOverEmailId(null);
    
    const emailId = e.dataTransfer.getData("emailId");
    if (emailId && dragOverEmailId) {
      onReorderEmails(emailId, dragOverEmailId, columnId);
    } else if (emailId) {
      onDropEmail(emailId, columnId);
    }
  };

  const handleEmailDragOver = (emailId: string) => {
    setDragOverEmailId(emailId);
  };

  const handleEmailDragLeave = () => {
    setDragOverEmailId(null);
  };

  return {
    isDraggingOver,
    dragOverEmailId,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleEmailDragOver,
    handleEmailDragLeave,
  };
};
