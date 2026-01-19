import React, { useState } from "react";
import { X, Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import { KanbanColumn, KanbanColumnRequest } from "../../types/kanban";
import { kanbanService } from "../../services/kanbanService";
import ColumnForm from "./ColumnForm";
import toast from "react-hot-toast";

interface KanbanSettingsModalProps {
  columns: KanbanColumn[];
  onClose: () => void;
  onColumnsUpdated: () => void;
}

const KanbanSettingsModal: React.FC<KanbanSettingsModalProps> = ({
  columns,
  onClose,
  onColumnsUpdated,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<KanbanColumn | null>(
    null,
  );

  const handleCreateColumn = async (data: KanbanColumnRequest) => {
    try {
      // Check for duplicate column ID on frontend first
      const existingColumn = columns.find(
        (col) => col.columnId === data.columnId,
      );
      if (existingColumn) {
        toast.error(
          `A column with ID "${data.columnId}" already exists. Please choose a different name.`,
        );
        return;
      }

      await kanbanService.createColumn(data);
      toast.success("Column created successfully");
      setShowForm(false);
      onColumnsUpdated();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to create column";
      toast.error(errorMessage);
    }
  };

  const handleUpdateColumn = async (data: KanbanColumnRequest) => {
    if (!editingColumn) return;

    try {
      await kanbanService.updateColumn(editingColumn.id, data);
      toast.success("Column updated successfully");
      setEditingColumn(null);
      onColumnsUpdated();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update column");
    }
  };

  const handleDeleteColumn = async (column: KanbanColumn) => {
    try {
      await kanbanService.deleteColumn(column.id);
      toast.success("Column deleted successfully");
      setDeletingColumn(null);
      onColumnsUpdated();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete column");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Kanban Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showForm || editingColumn ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingColumn ? "Edit Column" : "Create New Column"}
              </h3>
              <ColumnForm
                initialData={
                  editingColumn
                    ? {
                        name: editingColumn.name,
                        columnId: editingColumn.columnId,
                        color: editingColumn.color,
                      }
                    : undefined
                }
                onSubmit={
                  editingColumn ? handleUpdateColumn : handleCreateColumn
                }
                onCancel={() => {
                  setShowForm(false);
                  setEditingColumn(null);
                }}
                isEdit={!!editingColumn}
              />
            </div>
          ) : (
            <div>
              {/* Add Column Button */}
              <button
                onClick={() => setShowForm(true)}
                className="w-full mb-4 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                <span className="font-medium">Add New Column</span>
              </button>

              {/* Columns List */}
              <div className="space-y-2">
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    {/* Color indicator */}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: column.color }}
                    />

                    {/* Column info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {column.name}
                        </h4>
                        {column.isDefault && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            Default
                          </span>
                        )}
                        {column.gmailLabelId && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            Gmail Synced
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        ID: {column.columnId}
                      </p>
                      {column.gmailLabelName && (
                        <p className="text-xs text-gray-400">
                          Label: {column.gmailLabelName}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingColumn(column)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit column"
                      >
                        <Edit2 size={18} />
                      </button>
                      {!column.isDefault && (
                        <button
                          onClick={() => setDeletingColumn(column)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete column"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {deletingColumn && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="text-red-600" size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Delete Column
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Are you sure you want to delete "{deletingColumn.name}"?
                    {deletingColumn.gmailLabelId && (
                      <span className="block mt-2 text-red-600">
                        This will also delete the Gmail label "
                        {deletingColumn.gmailLabelName}".
                      </span>
                    )}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setDeletingColumn(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteColumn(deletingColumn)}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanSettingsModal;
