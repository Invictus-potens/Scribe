'use client';

import { useState } from 'react';
import type { KanbanColumn } from '../lib/kanbanHelpers';
import type { BoardPermissions } from '../lib/companyHelpers';

export interface ColumnActionsProps {
  column: KanbanColumn & { cards: any[] };
  permissions: BoardPermissions;
  onEdit: () => void;
  onDelete: () => void;
  onSetWipLimit: () => void;
  onAddCard: () => void;
  isEditing?: boolean;
  className?: string;
}

export default function ColumnActions({
  column,
  permissions,
  onEdit,
  onDelete,
  onSetWipLimit,
  onAddCard,
  isEditing = false,
  className = '',
}: ColumnActionsProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const canManageColumns = permissions.manage_columns;
  const canCreateCards = permissions.create_card;

  const handleTooltip = (action: string | null) => {
    setShowTooltip(action);
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* Edit button */}
      {canManageColumns && (
        <div className="relative">
          <button
            onClick={onEdit}
            disabled={isEditing}
            className={`
              p-1 rounded transition-all duration-200
              ${isEditing 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100'
              }
            `}
            onMouseEnter={() => handleTooltip('edit')}
            onMouseLeave={() => handleTooltip(null)}
            title="Edit column title"
            aria-label="Edit column title"
          >
            <i className="ri-edit-2-line w-4 h-4 text-gray-500 dark:text-gray-400"></i>
          </button>
          {showTooltip === 'edit' && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap z-10">
              Edit title
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
            </div>
          )}
        </div>
      )}

      {/* Add card button */}
      {canCreateCards && (
        <div className="relative">
          <button
            onClick={onAddCard}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            onMouseEnter={() => handleTooltip('add')}
            onMouseLeave={() => handleTooltip(null)}
            title="Add card to column"
            aria-label="Add card to column"
          >
            <i className="ri-add-line w-4 h-4 text-gray-500 dark:text-gray-400"></i>
          </button>
          {showTooltip === 'add' && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap z-10">
              Add card
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
            </div>
          )}
        </div>
      )}

      {/* WIP limit button */}
      {canManageColumns && (
        <div className="relative">
          <button
            onClick={onSetWipLimit}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all duration-200 opacity-0 group-hover:opacity-100"
            onMouseEnter={() => handleTooltip('wip')}
            onMouseLeave={() => handleTooltip(null)}
            title="Set WIP limit"
            aria-label="Set WIP limit"
          >
            <i className="ri-speed-up-line w-4 h-4 text-gray-500 dark:text-gray-400"></i>
          </button>
          {showTooltip === 'wip' && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap z-10">
              Set WIP limit
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
            </div>
          )}
        </div>
      )}

      {/* Delete button */}
      {canManageColumns && (
        <div className="relative">
          <button
            onClick={onDelete}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all duration-200 opacity-0 group-hover:opacity-100"
            onMouseEnter={() => handleTooltip('delete')}
            onMouseLeave={() => handleTooltip(null)}
            title="Delete column"
            aria-label="Delete column"
          >
            <i className="ri-delete-bin-line w-4 h-4 text-red-500 dark:text-red-400"></i>
          </button>
          {showTooltip === 'delete' && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-red-600 text-white text-xs rounded whitespace-nowrap z-10">
              Delete column
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-600"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}