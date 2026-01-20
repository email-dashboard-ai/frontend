import React, { useState } from "react";
import { KanbanColumnRequest } from "../../types/kanban";

interface ColumnFormProps {
  initialData?: {
    name: string;
    columnId: string;
    color: string;
  };
  onSubmit: (data: KanbanColumnRequest) => void;
  onCancel: () => void;
  isEdit?: boolean;
}

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Orange
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#F97316", // Orange-red
];

const ColumnForm: React.FC<ColumnFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isEdit,
}) => {
  const [name, setName] = useState(initialData?.name || "");
  const [columnId] = useState(initialData?.columnId || "");
  const [color, setColor] = useState(initialData?.color || PRESET_COLORS[0]);

  // Auto-generate column ID preview as user types
  const generatedColumnId = name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Auto-generate columnId from name if not editing
    const finalColumnId = isEdit ? columnId : columnId || generatedColumnId;

    onSubmit({
      name,
      columnId: finalColumnId,
      color,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Column Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Column Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Waiting for Reply"
          required
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {!isEdit && name && (
          <p className="text-xs text-gray-500 mt-1">
            Column ID will be:{" "}
            <span className="font-mono font-medium">{generatedColumnId}</span>
          </p>
        )}
      </div>

      {/* Column ID (only show for edit or advanced users) */}
      {isEdit && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Column ID
            <span className="text-xs text-gray-500 ml-2">
              (cannot be changed)
            </span>
          </label>
          <input
            type="text"
            value={columnId}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
          />
        </div>
      )}

      {/* Color Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Color
        </label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((presetColor) => (
            <button
              key={presetColor}
              type="button"
              onClick={() => setColor(presetColor)}
              className={`w-10 h-10 rounded-md border-2 transition-all ${
                color === presetColor
                  ? "border-gray-800 scale-110"
                  : "border-gray-300"
              }`}
              style={{ backgroundColor: presetColor }}
              title={presetColor}
            />
          ))}
          {/* Custom color input */}
          <div className="relative">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded-md border-2 border-gray-300 cursor-pointer"
              title="Custom color"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">Selected: {color}</p>
      </div>

      {/* Gmail Sync Info */}
      {!isEdit && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-800">
            <strong>Gmail Sync:</strong> A Gmail label will be automatically
            created or linked to this column.
          </p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {isEdit ? "Update Column" : "Create Column"}
        </button>
      </div>
    </form>
  );
};

export default ColumnForm;
