'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay as DndKitDragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragOverlay from './DragOverlay';

interface Note {
  id: string;
  title: string;
  content: string;
  folder?: string;
  tags?: string[];
  is_pinned?: boolean;
  updated_at?: string;
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
    transition,
    opacity: isDragging ? 0.5 : 1,
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
      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 draggable-note ${
        isSelected
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 border-2 border-blue-300 dark:border-blue-600'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-transparent'
      } ${
        isDragging ? 'rotate-2 scale-105 shadow-lg' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        {/* Handle para arrastar */}
        <div className="flex-shrink-0 mt-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full cursor-grab active:cursor-grabbing"></div>
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
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedNotes = notes.sort((a, b) => {
    // Pinned notes first
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    // Then by updated_at
    return new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime();
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Se arrastou para reordenar
    if (active.id !== over.id) {
      const oldIndex = sortedNotes.findIndex(note => note.id === active.id);
      const newIndex = sortedNotes.findIndex(note => note.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sortedNotes, oldIndex, newIndex);
        // Aqui você pode implementar a lógica para salvar a nova ordem no banco
        console.log('New order:', newOrder.map(note => note.id));
      }
    }
  };

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-2">
        {/* Lista de notas arrastáveis */}
        <SortableContext
          items={sortedNotes.map(note => note.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedNotes.map(note => (
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

      {/* Drag Overlay */}
      <DndKitDragOverlay>
        {activeId ? (
          <DragOverlay 
            note={sortedNotes.find(note => note.id === activeId) || {
              id: '',
              title: '',
              content: '',
            }}
          />
        ) : null}
      </DndKitDragOverlay>
    </DndContext>
  );
} 