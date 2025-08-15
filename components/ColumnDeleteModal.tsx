'use client';

import type { KanbanColumn } from '../lib/kanbanHelpers';

export interface ColumnDeleteModalProps {
  isOpen: boolean;
  column: KanbanColumn | null;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function ColumnDeleteModal({
  isOpen,
  column,
  onClose,
  onConfirm,
  loading = false,
}: ColumnDeleteModalProps) {
  if (!isOpen || !column) return null;

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Delete Column
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
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <i className="ri-delete-bin-line w-5 h-5 text-red-600 dark:text-red-400"></i>
            </div>
            <div>
              <p className="text-gray-800 dark:text-gray-200 font-medium">
                Are you sure you want to delete the column &ldquo;{column.title}&rdquo;?
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                This column is empty, so no cards will be affected. This action cannot be undone.
              </p>
            </div>
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
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Deleting...</span>
              </div>
            ) : (
              'Delete Column'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}