
'use client';

import { useState, useEffect } from 'react';
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

  // Function to reload notes
  const reloadNotes = async () => {
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
  };

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
  }, []);

  // Reload notes when parent component triggers update
  useEffect(() => {
    reloadNotes();
  }, [onNotesUpdate]);

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
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stripHtml(note.content).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    return matchesFolder && matchesSearch;
  }).sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime();
  });

  const handleNewFolder = async () => {
    if (newFolderName.trim()) {
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (!user) return;

        // Mostrar loading no botão
        const createButton = document.querySelector('[data-action="create-folder"]') as HTMLButtonElement;
        if (createButton) {
          createButton.disabled = true;
          createButton.innerHTML = 'Criando...';
        }

        const { data, error } = await foldersHelpers.createFolder({
          name: newFolderName,
          user_id: user.id
        });

        if (error) {
          console.error('Error creating folder:', error);
          return;
        }

        setFolders([...folders, data]);
        setNewFolderName('');
        setShowNewFolderModal(false);
      } catch (error) {
        console.error('Error creating folder:', error);
      } finally {
        // Restaurar botão
        const createButton = document.querySelector('[data-action="create-folder"]') as HTMLButtonElement;
        if (createButton) {
          createButton.disabled = false;
          createButton.innerHTML = 'Create';
        }
      }
    }
  };

  const handleNewNote = () => {
    const createNewNote = () => {
      const newNote = {
        id: '',
        title: 'Untitled Note',
        content: '',
        folder: selectedFolder === 'all' ? undefined : selectedFolder,
        tags: [],
        is_pinned: false,
        user_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setSelectedNote(newNote);
    };

    if (onCheckUnsavedChanges) {
      onCheckUnsavedChanges(createNewNote);
    } else {
      createNewNote();
    }
  };

  if (activeView !== 'notes') {
    return null;
  }

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleNewNote}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 whitespace-nowrap"
        >
          <i className="ri-add-line w-4 h-4 flex items-center justify-center"></i>
          <span>New Note</span>
        </button>
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Folders</h3>
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <i className="ri-add-line w-4 h-4 flex items-center justify-center text-gray-500"></i>
          </button>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => {
              const selectAllNotes = () => setSelectedFolder('all');
              
              if (onCheckUnsavedChanges) {
                onCheckUnsavedChanges(selectAllNotes);
              } else {
                selectAllNotes();
              }
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors whitespace-nowrap ${
              selectedFolder === 'all' 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <i className="ri-folder-line w-4 h-4 flex items-center justify-center"></i>
            <span className="flex-1">All Notes</span>
            <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full">
              {notes.length}
            </span>
          </button>

                     {folders.map(folder => (
             <div
               key={folder.id}
               className={`group w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors whitespace-nowrap ${
                 selectedFolder === folder.name 
                   ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                   : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
               }`}
             >
               <button
                 onClick={() => {
                   const selectFolder = () => setSelectedFolder(folder.name);
                   
                   if (onCheckUnsavedChanges) {
                     onCheckUnsavedChanges(selectFolder);
                   } else {
                     selectFolder();
                   }
                 }}
                 className="flex items-center space-x-3 flex-1"
               >
                 <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                 <span className="flex-1">{folder.name}</span>
                 <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full">
                   {notes.filter(note => note.folder === folder.name).length}
                 </span>
               </button>
               <button
                 onClick={async (event) => {
                   if (confirm(`Tem certeza que deseja deletar a pasta "${folder.name}"? Todas as notas nesta pasta serão movidas para "All Notes".`)) {
                     try {
                       // Mostrar loading
                       const button = event?.target as HTMLButtonElement;
                       const originalContent = button.innerHTML;
                       button.innerHTML = '<i class="ri-loader-4-line w-3 h-3 flex items-center justify-center animate-spin"></i>';
                       button.disabled = true;
                       
                       // Move all notes from this folder to "All Notes" (remove folder) - em paralelo
                       const notesInFolder = notes.filter(note => note.folder === folder.name);
                       const updatePromises = notesInFolder.map(note => 
                         notesHelpers.updateNote(note.id, { ...note, folder: undefined })
                       );
                       
                       // Executar todas as atualizações em paralelo
                       await Promise.all(updatePromises);
                       
                       // Delete the folder
                       const { error } = await foldersHelpers.deleteFolder(folder.id);
                       if (error) {
                         console.error('Error deleting folder:', error);
                         alert(`Error deleting folder: ${error.message}`);
                       } else {
                         setFolders(folders.filter(f => f.id !== folder.id));
                         if (selectedFolder === folder.name) {
                           setSelectedFolder('all');
                         }
                         // Reload notes to reflect changes
                         await reloadNotes();
                       }
                     } catch (error) {
                       console.error('Error deleting folder:', error);
                       alert('An unexpected error occurred while deleting the folder');
                     } finally {
                       // Restaurar botão
                       const button = event?.target as HTMLButtonElement;
                       if (button) {
                         button.innerHTML = '<i class="ri-delete-bin-line w-3 h-3 flex items-center justify-center"></i>';
                         button.disabled = false;
                       }
                     }
                   }
                 }}
                 className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100"
                 title="Delete Folder"
               >
                 <i className="ri-delete-bin-line w-3 h-3 flex items-center justify-center"></i>
               </button>
             </div>
           ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          {selectedFolder === 'all' ? 'All Notes' : folders.find(f => f.name === selectedFolder)?.name || 'Notes'}
        </h3>

        <div className="space-y-2">
          {filteredNotes.map(note => (
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
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedNote?.id === note.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm line-clamp-1">
                  {note.title}
                </h4>
                {note.is_pinned && (
                  <i className="ri-pushpin-fill w-3 h-3 flex items-center justify-center text-blue-500 ml-2"></i>
                )}
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                {stripHtml(note.content) || 'Sem conteúdo ainda...'}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {note.tags && note.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                  {note.tags && note.tags.length > 2 && (
                    <span className="text-xs text-gray-500">+{note.tags.length - 2}</span>
                  )}
                </div>

                <span className="text-xs text-gray-500">
                  {new Date(note.updated_at || '').toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleNewFolder()}
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleNewFolder}
                data-action="create-folder"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
