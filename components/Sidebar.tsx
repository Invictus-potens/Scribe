
'use client';

import { useState, useEffect, useCallback } from 'react';
import { notesHelpers, foldersHelpers, authHelpers, Note, Folder } from '../lib/supabase';

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

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

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

  const filteredNotes = notes.filter(note => {
    const matchesFolder = selectedFolder === 'all' || note.folder === selectedFolder;
    const matchesSearch = !searchTerm || 
      note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stripHtml(note.content || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFolder && matchesSearch;
  });

  const handleNewFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) return;

      const { data, error } = await foldersHelpers.createFolder({
        name: newFolderName.trim(),
        user_id: user.id,
      });

      if (error) {
        console.error('Error creating folder:', error);
        alert(`Error creating folder: ${error.message}`);
      } else {
        setFolders(prev => [...prev, data]);
        setNewFolderName('');
        setShowNewFolderModal(false);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('An unexpected error occurred while creating the folder');
    }
  };

  const handleNewNote = () => {
    const createNewNote = () => {
      const newNote = {
        title: 'Nova Nota',
        content: '',
        tags: [],
        is_pinned: false,
        folder: selectedFolder !== 'all' ? selectedFolder : undefined,
      };
      setSelectedNote(newNote);
    };

    if (onCheckUnsavedChanges) {
      onCheckUnsavedChanges(createNewNote);
    } else {
      createNewNote();
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    if (!confirm(`Tem certeza que deseja deletar a pasta "${folderName}"? Todas as notas nesta pasta serão movidas para "Todas as Notas".`)) {
      return;
    }

    try {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) return;

      // Delete folder and move notes to "all"
      const { error: folderError } = await foldersHelpers.deleteFolder(folderName);
      if (folderError) {
        console.error('Error deleting folder:', folderError);
        alert(`Error deleting folder: ${folderError.message}`);
        return;
      }

      // Update folders list
      setFolders(prev => prev.filter(folder => folder.name !== folderName));

      // If the deleted folder was selected, switch to "all"
      if (selectedFolder === folderName) {
        setSelectedFolder('all');
      }

      // Reload notes to reflect the changes
      await reloadNotes();
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('An unexpected error occurred while deleting the folder');
    }
  };

  if (loading) {
    return (
      <div className="sidebar-width bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 h-full">
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <i className="ri-loader-4-line w-4 h-4 text-white animate-spin"></i>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar-width bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Notas</h2>
          <button
            onClick={handleNewNote}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
          >
            Nova Nota
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Nova Pasta
          </button>
        </div>
      </div>

      {/* Folders and Notes */}
      <div className="flex-1 overflow-y-auto">
        {/* All Notes */}
        <div className="p-4">
          <button
            onClick={() => {
              const selectAllNotes = () => setSelectedFolder('all');
              if (onCheckUnsavedChanges) {
                onCheckUnsavedChanges(selectAllNotes);
              } else {
                selectAllNotes();
              }
            }}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              selectedFolder === 'all'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
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

        {/* Folders */}
        {folders.map(folder => (
          <div key={folder.name} className="px-4 mb-2">
            <div className="flex items-center justify-between group">
              <button
                onClick={() => {
                  const selectFolder = () => setSelectedFolder(folder.name);
                  if (onCheckUnsavedChanges) {
                    onCheckUnsavedChanges(selectFolder);
                  } else {
                    selectFolder();
                  }
                }}
                className={`flex-1 text-left p-3 rounded-lg transition-colors ${
                  selectedFolder === folder.name
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <i className="ri-folder-line w-4 h-4"></i>
                    <span className="font-medium">{folder.name}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {notes.filter(note => note.folder === folder.name).length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => handleDeleteFolder(folder.name)}
                className="ml-2 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Deletar pasta"
              >
                <i className="ri-delete-bin-line w-4 h-4"></i>
              </button>
            </div>
          </div>
        ))}

        {/* Notes List */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
            {selectedFolder === 'all' ? 'Todas as Notas' : `Notas em "${selectedFolder}"`}
          </h3>
          
          <div className="space-y-2">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-8">
                <i className="ri-file-text-line w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2"></i>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {searchTerm ? 'Nenhuma nota encontrada' : 'Nenhuma nota ainda'}
                </p>
              </div>
            ) : (
              filteredNotes
                .sort((a, b) => {
                  // Pinned notes first
                  if (a.is_pinned && !b.is_pinned) return -1;
                  if (!a.is_pinned && b.is_pinned) return 1;
                  // Then by updated_at
                  return new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime();
                })
                .map(note => (
                  <div
                    key={note.id}
                    onClick={() => {
                      const selectNote = () => setSelectedNote(note);
                      if (onCheckUnsavedChanges) {
                        onCheckUnsavedChanges(selectNote);
                      } else {
                        selectNote();
                      }
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedNote?.id === note.id
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {note.title || 'Sem título'}
                          </h4>
                          {note.is_pinned && (
                            <i className="ri-pushpin-fill w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0"></i>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {stripHtml(note.content || 'Sem conteúdo')}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {new Date(note.updated_at || '').toLocaleDateString()}
                          </span>
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex space-x-1">
                              {note.tags.slice(0, 2).map(tag => (
                                <span
                                  key={tag}
                                  className="text-xs bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {note.tags.length > 2 && (
                                <span className="text-xs text-gray-400">
                                  +{note.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
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
    </div>
  );
}
