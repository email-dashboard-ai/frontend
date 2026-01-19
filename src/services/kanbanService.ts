import { api } from '../config/apiConfig';
import { KanbanColumn, KanbanColumnRequest } from '../types/kanban';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

/**
 * Service for managing Kanban columns
 */
export const kanbanService = {
  /**
   * Get all columns for the current user
   */
  async getColumns(signal?: AbortSignal): Promise<KanbanColumn[]> {
    const { data } = await api.get<ApiResponse<KanbanColumn[]>>('/api/kanban/columns', {
      signal,
    });
    return data.data;
  },

  /**
   * Create a new column
   */
  async createColumn(request: KanbanColumnRequest): Promise<KanbanColumn> {
    const { data } = await api.post<ApiResponse<KanbanColumn>>('/api/kanban/columns', request);
    return data.data;
  },

  /**
   * Update an existing column
   */
  async updateColumn(id: number, request: KanbanColumnRequest): Promise<KanbanColumn> {
    const { data } = await api.put<ApiResponse<KanbanColumn>>(
      `/api/kanban/columns/${id}`,
      request
    );
    return data.data;
  },

  /**
   * Delete a column
   */
  async deleteColumn(id: number): Promise<void> {
    await api.delete(`/api/kanban/columns/${id}`);
  },
};
