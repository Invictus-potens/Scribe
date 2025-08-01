'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Note {
  id: string;
  title: string;
  content: string;
  folder?: string;
  tags?: string[];
  is_pinned?: boolean;
  updated_at?: string;
  position?: number;
}

interface DraggableNotesListProps {
  notes: Note[];
  selectedFolder: string;
  selectedNote: any;
  setSelectedNote: (note: any) => void;
  onNotesUpdate: () => void;
  onCheckUnsavedChanges?: (action: () => void) => void;
}

// Componente para cada nota arrastável
function SortableNoteItem({ 
  note, 
  isSelected, 
  onSelect, 
  onCheckUnsavedChanges 
}: { 
  note: Note; 
  isSelected: boolean; 
  onSelect: () => void;
  onCheckUnsavedChanges?: (action: () => void) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: note.id,
    data: {
      type: 'note',
      note,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const stripHtml = (html: string) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const handleClick = () => {
    const selectNote = () => onSelect();
    if (onCheckUnsavedChanges) {
      onCheckUnsavedChanges(selectNote);
    } else {
      selectNote();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      data-dragging={isDragging}
      data-note-id={note.id}
      className={`p-3 rounded-lg cursor-pointer transition-all duration-300 ease-out draggable-note ${
        isSelected
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 border-2 border-blue-300 dark:border-blue-600'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-transparent'
      } ${
        isDragging 
          ? 'rotate-1 scale-110 shadow-2xl border-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        {/* Handle para arrastar */}
        <div className="flex-shrink-0 mt-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full cursor-grab active:cursor-grabbing drag-handle"></div>
        </div>
        
        {/* Conteúdo da nota */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium truncate">
              {note.title || 'Sem título'}
            </h3>
            {note.is_pinned && (
              <i className="ri-pushpin-line w-3 h-3 text-blue-500 flex-shrink-0 ml-2"></i>
            )}
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {stripHtml(note.content || '') || 'Sem conteúdo'}
          </p>
          
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {note.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded"
                >
                  {tag}
                </span>
              ))}
              {note.tags.length > 3 && (
                <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                  +{note.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DraggableNotesList({
  notes,
  selectedFolder,
  selectedNote,
  setSelectedNote,
  onNotesUpdate,
  onCheckUnsavedChanges
}: DraggableNotesListProps) {


  const sortedNotes = useMemo(() => {
    return notes.sort((a, b) => {
      // Pinned notes first
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      // Then by position (if available) or updated_at
      if (a.position !== undefined && b.position !== undefined) {
        return a.position - b.position;
      }
      return new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime();
    });
  }, [notes]);



  if (notes.length === 0) {
    return (
      <div className="text-center py-8">
        <i className="ri-file-text-line w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2"></i>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Nenhuma nota ainda
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Lista de notas arrastáveis */}
      <SortableContext
        items={sortedNotes.map(note => note.id)}
        strategy={verticalListSortingStrategy}
      >
        {sortedNotes.map((note, index) => (
          <SortableNoteItem
            key={note.id}
            note={note}
            isSelected={selectedNote?.id === note.id}
            onSelect={() => setSelectedNote(note)}
            onCheckUnsavedChanges={onCheckUnsavedChanges}
          />
        ))}
      </SortableContext>
    </div>
  );
} 