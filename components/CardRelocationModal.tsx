'use client';

import { useState } from 'react';
import type { KanbanColumn, KanbanCard } from '../lib/kanbanHelpers';

export interface CardRelocationModalProps {
  isOpen: boolean;
  column: (KanbanColumn & { cards: KanbanCard[] }) | null;
  availableColumns: (KanbanColumn & { cards: KanbanCard[] })[];
  onClose: () => void;
  onRelocate: (targetColumnId: string) => void;
  onDeleteAll: () => void;
  loading?: boolean;
}

export default function CardRelocationModal({
  isOpen,
  column,
  availableColumns,
  onClose,
  onRelocate,
  onDeleteAll,
  loading = false,
}: CardRelocationModalProps) {
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [action, setAction] = useState<'relocate' | 'delete'>('relocate');

  if (!isOpen || !column) return null;

  const cardCount = column.cards.length;
  const hasAvailableColumns = availableColumns.length > 0;

  const handleConfirm = () => {
    if (action === 'delete') {
      onDeleteAll();
    } else if (selectedColumnId) {
      onRelocate(selectedColumnId);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedColumnId('');
      setAction('relocate');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Delete Column "{column.title}"
          </h3>
          {!loading && (
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <i className="ri-close-line w-5 h-5"></i>
            </button>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <i className="ri-alert-line w-5 h-5 text-yellow-600 dark:text-yellow-400"></i>
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                This column contains {cardCount} card{cardCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Choose what to do with the cards before deleting the column.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {hasAvailableColumns && (
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="action"
                  value="relocate"
                  checked={action === 'relocate'}
                  onChange={(e) => setAction(e.target.value as 'relocate')}
                  className="mt-1"
                  disabled={loading}
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-800 dark:text-gray-200">
                    Move cards to another column
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    All cards will be moved to the selected column
                  </div>
                  {action === 'relocate' && (
                    <select
                      value={selectedColumnId}
                      onChange={(e) => setSelectedColumnId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      disabled={loading}
                    >
                      <option value="">Select a column...</option>
                      {availableColumns.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.title} ({col.cards.length} cards)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
            )}

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="action"
                value="delete"
                checked={action === 'delete'}
                onChange={(e) => setAction(e.target.value as 'delete')}
                className="mt-1"
                disabled={loading}
              />
              <div className="flex-1">
                <div className="font-medium text-red-600 dark:text-red-400">
                  Delete all cards
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  All cards in this column will be permanently deleted
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || (action === 'relocate' && !selectedColumnId)}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              ${action === 'delete'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <>
                {action === 'delete' ? 'Delete Column & Cards' : 'Move Cards & Delete Column'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}