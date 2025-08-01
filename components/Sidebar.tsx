
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay as DndKitDragOverlay,
} from '@dnd-kit/core';
import { notesHelpers, foldersHelpers, authHelpers, Note, Folder } from '../lib/supabase';
import DraggableNotesList from './DraggableNotesList';
import DragOverlay from './DragOverlay';
import { useSortable } from '@dnd-kit/sortable';

interface SidebarProps {
  selectedFolder: string;
  setSelectedFolder: (folder: string) => void;
  activeView: string;
  selectedNote: any;
  setSelectedNote: (note: any) => void;
  searchTerm: string;
  onNotesUpdate?: () => void;
  onNotesLoaded?: (notes: any[]) => void;
  hasUnsavedChanges?: boolean;
  onCheckUnsavedChanges?: (action: () => void) => void;
}

// Componente para pasta arrastável
function DraggableFolder({ 
  folder, 
  notes, 
  isSelected, 
  onSelect, 
  onDrop,
  onDelete
}: { 
  folder: Folder; 
  notes: Note[];
  isSelected: boolean; 
  onSelect: () => void;
  onDrop: (noteId: string, folderName: string) => void;
  onDelete: (folder: Folder) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isOver,
  } = useSortable({ 
    id: `folder-${folder.name}`,
    data: {
      type: 'folder',
      folderName: folder.name,
    }
  });

  const folderNotes = notes.filter(note => note.folder === folder.name);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`px-4 mb-2 transition-all duration-200 ${
        isOver ? 'scale-105' : ''
      }`}
    >
      <div className="flex items-center justify-between group">
        <button
          onClick={onSelect}
          className={`flex-1 text-left p-3 rounded-lg transition-colors ${
            isSelected
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          } ${
            isOver ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <i className="ri-folder-line w-4 h-4"></i>
              <span className="font-medium">{folder.name}</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {folderNotes.length}
            </span>
          </div>
        </button>
        <button
          onClick={() => onDelete(folder)}
          className="ml-2 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Deletar pasta"
        >
          <i className="ri-delete-bin-line w-4 h-4"></i>
        </button>
      </div>
    </div>
  );
}

// Componente para "Todas as Notas" arrastável
function DraggableAllNotes({ 
  notes, 
  isSelected, 
  onSelect, 
  onDrop 
}: { 
  notes: Note[];
  isSelected: boolean; 
  onSelect: () => void;
  onDrop: (noteId: string, folderName: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isOver,
  } = useSortable({ 
    id: 'folder-all',
    data: {
      type: 'folder',
      folderName: 'all',
    }
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`p-4 transition-all duration-200 ${
        isOver ? 'scale-105' : ''
      }`}
    >
      <button
        onClick={onSelect}
        className={`w-full text-left p-3 rounded-lg transition-colors ${
          isSelected
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
        } ${
          isOver ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <i className="ri-folder-line w-4 h-4"></i>
            <span className="font-medium">Todas as Notas</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {notes.length}
          </span>
        </div>
      </button>
    </div>
  );
}

export default function Sidebar({ 
  selectedFolder, 
  setSelectedFolder, 
  activeView, 
  selectedNote, 
  setSelectedNote,
  searchTerm,
  onNotesUpdate,
  onNotesLoaded,
  hasUnsavedChanges = false,
  onCheckUnsavedChanges
}: SidebarProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Function to reload notes - wrapped in useCallback to prevent unnecessary re-renders
  const reloadNotes = useCallback(async () => {
    try {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) return;

      const { data: notesData, error: notesError } = await notesHelpers.getNotes(user.id);
      if (notesError) {
        console.error('Error loading notes:', notesError);
      } else {
        setNotes(notesData || []);
        if (onNotesLoaded) {
          onNotesLoaded(notesData || []);
        }
      }
    } catch (error) {
      console.error('Error reloading notes:', error);
    }
  }, [onNotesLoaded]);

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (!user) return;

        // Load folders
        const { data: foldersData, error: foldersError } = await foldersHelpers.getFolders(user.id);
        if (foldersError) {
          console.error('Error loading folders:', foldersError);
        } else {
          setFolders(foldersData || []);
        }

        // Load notes
        await reloadNotes();
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [reloadNotes]);

  // Reload notes when parent component triggers update - using a ref to track updates
  useEffect(() => {
    if (onNotesUpdate) {
      // Only reload if we have a valid onNotesUpdate function
      reloadNotes();
    }
  }, [reloadNotes]);

  // Função para remover tags HTML e extrair texto puro
  const stripHtml = (html: string) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Filtrar notas baseado no termo de busca
  const filteredNotes = notes.filter(note => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const title = (note.title || '').toLowerCase();
    const content = stripHtml(note.content || '').toLowerCase();
    return title.includes(searchLower) || content.includes(searchLower);
  });

  const handleNewFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) return;

      const { error } = await foldersHelpers.createFolder({
        name: newFolderName.trim(),
        user_id: user.id,
      });
      if (error) {
        console.error('Error creating folder:', error);
        alert(`Erro ao criar pasta: ${error.message}`);
      } else {
        // Reload folders
        const { data: foldersData, error: foldersError } = await foldersHelpers.getFolders(user.id);
        if (!foldersError) {
          setFolders(foldersData || []);
        }
        setShowNewFolderModal(false);
        setNewFolderName('');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Erro inesperado ao criar pasta');
    }
  };

  const handleNewNote = () => {
    const createNewNote = () => {
      // Esta função será implementada no componente pai
      console.log('Create new note');
    };

    if (onCheckUnsavedChanges) {
      onCheckUnsavedChanges(createNewNote);
    } else {
      createNewNote();
    }
  };

  const handleDeleteFolder = async (folder: Folder) => {
    console.log('handleDeleteFolder called with folder:', folder);
    
    if (!confirm(`Tem certeza que deseja deletar a pasta "${folder.name}"? Todas as notas nesta pasta serão movidas para "Todas as Notas".`)) {
      return;
    }

    try {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      console.log('Moving notes from folder:', folder.name);
      
      // Primeiro, mover todas as notas da pasta para "Todas as Notas"
      const folderNotes = notes.filter(note => note.folder === folder.name);
      console.log('Notes to move:', folderNotes.length);
      
      for (const note of folderNotes) {
        const updatedNote = { ...note, folder: undefined };
        const { error } = await notesHelpers.updateNote(note.id, updatedNote);
        if (error) {
          console.error('Error updating note:', error);
        }
      }

      console.log('Deleting folder:', folder.id);
      
      // Depois, deletar a pasta
      const { error } = await foldersHelpers.deleteFolder(folder.id);
      if (error) {
        console.error('Error deleting folder:', error);
        alert(`Erro ao deletar pasta: ${error.message}`);
      } else {
        console.log('Folder deleted successfully');
        
        // Reload folders and notes
        const { data: foldersData, error: foldersError } = await foldersHelpers.getFolders(user.id);
        if (!foldersError) {
          setFolders(foldersData || []);
        }
        await reloadNotes();

        // Se a pasta deletada era a selecionada, voltar para "Todas as Notas"
        if (selectedFolder === folder.name) {
          setSelectedFolder('all');
        }
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('Erro inesperado ao deletar pasta');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Se arrastou uma nota para uma pasta
    if (over.data?.current?.type === 'folder' && active.data?.current?.type === 'note') {
      const folderName = over.data.current.folderName;
      const noteId = active.id as string;
      
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (!user) return;

        const noteToUpdate = notes.find(note => note.id === noteId);
        if (!noteToUpdate) return;

        const updatedNote = {
          ...noteToUpdate,
          folder: folderName === 'all' ? undefined : folderName,
        };

        const { error } = await notesHelpers.updateNote(noteId, updatedNote);
        if (error) {
          console.error('Error moving note to folder:', error);
          alert(`Erro ao mover nota: ${error.message}`);
        } else {
          onNotesUpdate?.();
        }
      } catch (error) {
        console.error('Error moving note:', error);
        alert('Erro inesperado ao mover a nota');
      }
    }
  };

  if (loading) {
    return (
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
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
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
              Scribe
            </h2>
            <button
              onClick={handleNewNote}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Nova nota"
            >
              <i className="ri-add-line w-5 h-5"></i>
            </button>
          </div>
          
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="w-full p-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center space-x-2"
          >
            <i className="ri-add-line w-4 h-4"></i>
            <span>Nova Pasta</span>
          </button>
        </div>

        {/* Folders and Notes */}
        <div className="flex-1 overflow-y-auto">
          {/* All Notes */}
          <DraggableAllNotes
            notes={notes}
            isSelected={selectedFolder === 'all'}
            onSelect={() => {
              const selectAllNotes = () => setSelectedFolder('all');
              if (onCheckUnsavedChanges) {
                onCheckUnsavedChanges(selectAllNotes);
              } else {
                selectAllNotes();
              }
            }}
            onDrop={async (noteId, folderName) => {
              try {
                const { user } = await authHelpers.getCurrentUser();
                if (!user) return;

                const noteToUpdate = notes.find(note => note.id === noteId);
                if (!noteToUpdate) return;

                const updatedNote = {
                  ...noteToUpdate,
                  folder: folderName === 'all' ? undefined : folderName,
                };

                const { error } = await notesHelpers.updateNote(noteId, updatedNote);
                if (error) {
                  console.error('Error moving note:', error);
                  alert(`Erro ao mover nota: ${error.message}`);
                } else {
                  onNotesUpdate?.();
                }
              } catch (error) {
                console.error('Error moving note:', error);
                alert('Erro inesperado ao mover a nota');
              }
            }}
          />

          {/* Folders */}
          {folders.map(folder => (
            <DraggableFolder
              key={folder.name}
              folder={folder}
              notes={notes}
              isSelected={selectedFolder === folder.name}
              onSelect={() => {
                const selectFolder = () => setSelectedFolder(folder.name);
                if (onCheckUnsavedChanges) {
                  onCheckUnsavedChanges(selectFolder);
                } else {
                  selectFolder();
                }
              }}
              onDrop={async (noteId, folderName) => {
                try {
                  const { user } = await authHelpers.getCurrentUser();
                  if (!user) return;

                  const noteToUpdate = notes.find(note => note.id === noteId);
                  if (!noteToUpdate) return;

                  const updatedNote = {
                    ...noteToUpdate,
                    folder: folderName === 'all' ? undefined : folderName,
                  };

                  const { error } = await notesHelpers.updateNote(noteId, updatedNote);
                  if (error) {
                    console.error('Error moving note:', error);
                    alert(`Erro ao mover nota: ${error.message}`);
                  } else {
                    onNotesUpdate?.();
                  }
                } catch (error) {
                  console.error('Error moving note:', error);
                  alert('Erro inesperado ao mover a nota');
                }
              }}
              onDelete={handleDeleteFolder}
            />
          ))}

          {/* Notes List */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
              {selectedFolder === 'all' ? 'Todas as Notas' : `Notas em "${selectedFolder}"`}
            </h3>
            
            <DraggableNotesList
              notes={filteredNotes}
              selectedFolder={selectedFolder}
              selectedNote={selectedNote}
              setSelectedNote={setSelectedNote}
              onNotesUpdate={reloadNotes}
              onCheckUnsavedChanges={onCheckUnsavedChanges}
            />
          </div>
        </div>

        {/* New Folder Modal */}
        {showNewFolderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Nova Pasta
              </h3>
              
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNewFolder()}
                placeholder="Nome da pasta"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-4"
              />
              
              <div className="flex space-x-3">
                <button
                  onClick={handleNewFolder}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Criar
                </button>
                <button
                  onClick={() => {
                    setShowNewFolderModal(false);
                    setNewFolderName('');
                  }}
                  className="flex-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-4 py-2 font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Drag Overlay */}
        <DndKitDragOverlay>
          {activeId ? (
            <DragOverlay 
              note={notes.find(note => note.id === activeId) || {
                id: '',
                title: '',
                content: '',
              }}
            />
          ) : null}
        </DndKitDragOverlay>
      </div>
    </DndContext>
  );
}
