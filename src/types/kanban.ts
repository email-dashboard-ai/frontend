/**
 * Kanban column configuration
 */
export interface KanbanColumn {
  id: number;
  name: string;
  columnId: string;
  position: number;
  gmailLabelId: string | null;
  gmailLabelName: string | null;
  color: string;
  isDefault: boolean;
}

/**
 * Request to create or update a Kanban column
 * 
 * All columns are automatically synced with Gmail labels.
 * If a label with the same name exists, it will be linked.
 * Otherwise, a new Gmail label will be created.
 */
export interface KanbanColumnRequest {
  name: string;
  columnId: string;
  position?: number;
  color: string;
}

