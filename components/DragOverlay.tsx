'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface DragOverlayProps {
  note: {
    id: string;
    title: string;
    content: string;
    is_pinned?: boolean;
    tags?: string[];
  };
}

export default function DragOverlay({ note }: DragOverlayProps) {
  const stripHtml = (html: string) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-600 shadow-xl opacity-90 transform rotate-2 scale-105 drag-overlay">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <h4 className="font-medium text-sm truncate text-blue-600 dark:text-blue-400">
                {note.title || 'Sem título'}
              </h4>
            </div>
            {note.is_pinned && (
              <i className="ri-pushpin-fill w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0"></i>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {stripHtml(note.content || 'Sem conteúdo')}
          </p>
          {note.tags && note.tags.length > 0 && (
            <div className="flex space-x-1 mt-2">
              {note.tags.slice(0, 2).map(tag => (
                <span
                  key={tag}
                  className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
              {note.tags.length > 2 && (
                <span className="text-xs text-blue-400">
                  +{note.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 