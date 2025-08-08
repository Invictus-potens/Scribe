'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { foldersHelpers, notesHelpers, authHelpers, Note, Folder } from '../lib/supabase';
import DraggableNotesList from './DraggableNotesList';
import { useDroppable } from '@dnd-kit/core';

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
  notes: Note[]; // Notas passadas do componente pai
}

// Componente para pasta arrastável
function DraggableFolder({ 
  folder, 
  notes, 
  isSelected, 
  onSelect, 
  onDelete
}: { 
  folder: Folder; 
  notes: Note[];
  isSelected: boolean; 
  onSelect: () => void;
  onDelete: (folder: Folder) => void;
}) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({ 
    id: `folder-${folder.name}`,
    data: {
      type: 'folder',
      folderName: folder.name,
    }
  });

  const folderNotes = useMemo(() => 
    notes.filter(note => note.folder === folder.name), 
    [notes, folder.name]
  );

  return (
    <div
      ref={setNodeRef}
      className={`px-4 mb-2 transition-all duration-200 ${
        isOver ? 'scale-105 folder-drop-hover' : ''
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
            isOver ? 'ring-2 ring-green-400 bg-green-50 dark:bg-green-900/20' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <i className="ri-folder-line w-4 h-4"></i>
              <span className="font-medium">{folder.name}</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full min-w-[24px] text-center">
              {folderNotes.length}
            </span>
          </div>
        </button>
        {folder.name !== 'default' && (
          <button
            onClick={() => onDelete(folder)}
            className="ml-2 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200"
            title="Deletar pasta"
          >
            <i className="ri-delete-bin-line w-4 h-4"></i>
          </button>
        )}
      </div>
    </div>
  );
}

// Componente para "Todas as Notas" arrastável
function DraggableAllNotes({ 
  notes, 
  isSelected, 
  onSelect
}: { 
  notes: Note[];
  isSelected: boolean; 
  onSelect: () => void;
}) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({ 
    id: 'folder-all',
    data: {
      type: 'folder',
      folderName: 'all',
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-4 transition-all duration-200 ${
        isOver ? 'scale-105 folder-drop-hover' : ''
      }`}
    >
      <button
        onClick={onSelect}
        className={`w-full text-left p-3 rounded-lg transition-colors ${
          isSelected
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
        } ${
          isOver ? 'ring-2 ring-green-400 bg-green-50 dark:bg-green-900/20' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <i className="ri-folder-open-line w-4 h-4"></i>
            <span className="font-medium">Todas as Notas</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full min-w-[24px] text-center">
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
  onCheckUnsavedChanges,
  notes = []
}: SidebarProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Load folders from Supabase
  const loadFolders = useCallback(async () => {
    try {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) return;

      const { data: foldersData, error: foldersError } = await foldersHelpers.getFolders(user.id);
      if (foldersError) {
        console.error('Error loading folders:', foldersError);
      } else {
        setFolders(foldersData || []);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Função para remover tags HTML e extrair texto puro
  const stripHtml = useCallback((html: string) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }, []);

  // Filtrar notas baseado no termo de busca e pasta selecionada
  const filteredNotes = useMemo(() => {
    console.log('Sidebar: Filtrando notas...');
    console.log('Sidebar: selectedFolder:', selectedFolder);
    console.log('Sidebar: total de notas:', notes.length);
    
    let base = notes;
    if (showArchived) {
      base = base.filter(n => n.is_archived);
    } else {
      base = base.filter(n => !n.is_archived);
    }
    if (showFavorites) {
      base = base.filter(n => n.is_favorite);
    }

    const tagTokens = tagQuery
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    const filtered = base.filter(note => {
      // Filtrar por pasta selecionada
      if (selectedFolder !== 'all') {
        if (note.folder !== selectedFolder) {
          console.log('Sidebar: nota filtrada por pasta:', note.title, 'pasta:', note.folder, 'selectedFolder:', selectedFolder);
          return false;
        }
      }
      if (onlyPinned && !note.is_pinned) return false;
      // Tags
      if (tagTokens.length > 0) {
        const noteTags = (note.tags || []).map(t => (t || '').toLowerCase());
        const hasAny = tagTokens.some(t => noteTags.includes(t));
        if (!hasAny) return false;
      }
      // Date range
      if (dateFrom) {
        const updated = note.updated_at ? new Date(note.updated_at).getTime() : 0;
        const fromTs = new Date(dateFrom).getTime();
        if (!(updated >= fromTs)) return false;
      }
      if (dateTo) {
        const updated = note.updated_at ? new Date(note.updated_at).getTime() : 0;
        const toTs = new Date(dateTo).getTime();
        if (!(updated <= toTs)) return false;
      }
      
      // Filtrar por termo de busca
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      const title = (note.title || '').toLowerCase();
      const content = stripHtml(note.content || '').toLowerCase();
      return title.includes(searchLower) || content.includes(searchLower);
    });
    
    console.log('Sidebar: notas filtradas:', filtered.length);
    return filtered;
  }, [notes, selectedFolder, searchTerm, stripHtml, showFavorites, showArchived, onlyPinned, tagQuery, dateFrom, dateTo]);

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
        await loadFolders(); // Recarregar pastas
        setShowNewFolderModal(false);
        setNewFolderName('');
        
        // Feedback visual de sucesso
        setTimeout(() => {
          const toast = document.createElement('div');
          toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
          toast.textContent = 'Pasta criada com sucesso!';
          document.body.appendChild(toast);
          setTimeout(() => document.body.removeChild(toast), 3000);
        }, 100);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Erro inesperado ao criar pasta');
    }
  };

  const handleNewNote = async () => {
    const createNewNote = async () => {
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (!user) {
          console.error('User not authenticated');
          return;
        }

        // Criar uma nova nota vazia
        const newNote = {
          user_id: user.id,
          title: 'Nova Nota',
          content: '',
          tags: [],
          is_pinned: false,
          folder: selectedFolder !== 'all' ? selectedFolder : undefined,
        };

        const { data, error } = await notesHelpers.createNote(newNote);
        if (error) {
          console.error('Error creating note:', error);
          alert(`Erro ao criar nota: ${error.message}`);
          return;
        }

        // Selecionar a nova nota
        setSelectedNote(data);
        
        // Trigger notes update
        if (onNotesUpdate) {
          onNotesUpdate();
        }

        // Feedback visual de sucesso
        setTimeout(() => {
          const toast = document.createElement('div');
          toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
          toast.textContent = 'Nova nota criada!';
          document.body.appendChild(toast);
          setTimeout(() => document.body.removeChild(toast), 3000);
        }, 100);
      } catch (error) {
        console.error('Error creating note:', error);
        alert('Erro inesperado ao criar nota');
      }
    };

    if (onCheckUnsavedChanges) {
      onCheckUnsavedChanges(createNewNote);
    } else {
      createNewNote();
    }
  };

  const handleDeleteFolder = async (folder: Folder) => {
    console.log('handleDeleteFolder called with folder:', folder);
    
    const folderNotes = notes.filter(note => note.folder === folder.name);
    const confirmMessage = folderNotes.length > 0 
      ? `Tem certeza que deseja deletar a pasta "${folder.name}"? As ${folderNotes.length} nota(s) desta pasta serão movidas para "Todas as Notas".`
      : `Tem certeza que deseja deletar a pasta "${folder.name}"?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      console.log('Deleting folder:', folder.id);
      
      const { error } = await foldersHelpers.deleteFolder(folder.id);
      if (error) {
        console.error('Error deleting folder:', error);
        alert(`Erro ao deletar pasta: ${error.message}`);
      } else {
        console.log('Folder deleted successfully');
        
        await loadFolders(); // Recarregar pastas
        
        // Se a pasta deletada era a selecionada, voltar para "Todas as Notas"
        if (selectedFolder === folder.name) {
          setSelectedFolder('all');
        }
        
        // Trigger notes update para mover as notas
        if (onNotesUpdate) {
          onNotesUpdate();
        }
        
        // Feedback visual de sucesso
        setTimeout(() => {
          const toast = document.createElement('div');
          toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
          toast.textContent = 'Pasta deletada com sucesso!';
          document.body.appendChild(toast);
          setTimeout(() => document.body.removeChild(toast), 3000);
        }, 100);
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('Erro inesperado ao deletar pasta');
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
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            Scribe
          </h2>
          <button
            onClick={handleNewNote}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
            title="Nova nota"
          >
            <i className="ri-add-line w-5 h-5"></i>
          </button>
        </div>
        
        <button
          onClick={() => setShowNewFolderModal(true)}
          className="w-full p-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center space-x-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
        >
          <i className="ri-folder-add-line w-4 h-4"></i>
          <span>Nova Pasta</span>
        </button>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={() => setShowFavorites(v => !v)}
            className={`flex-1 p-2 text-xs rounded-lg transition-colors ${showFavorites ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            title="Filtrar favoritos"
          >
            <i className="ri-star-fill mr-1"></i>
            Favoritos
          </button>
          <button
            onClick={() => setShowArchived(v => !v)}
            className={`flex-1 p-2 text-xs rounded-lg transition-colors ${showArchived ? 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            title="Mostrar arquivadas"
          >
            <i className="ri-archive-line mr-1"></i>
            Arquivadas
          </button>
          <button
            onClick={() => setOnlyPinned(v => !v)}
            className={`flex-1 p-2 text-xs rounded-lg transition-colors ${onlyPinned ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            title="Somente fixadas"
          >
            <i className="ri-pushpin-2-line mr-1"></i>
            Fixadas
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Tags (separe por vírgula)"
            value={tagQuery}
            onChange={e => setTagQuery(e.target.value)}
            className="col-span-2 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
          />
        </div>
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
        />

        {/* Folders */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
          {folders.length > 0 && (
            <div className="px-4 py-2">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Pastas
              </h4>
            </div>
          )}
          
          {folders.map(folder => (
            <DraggableFolder
              key={folder.id}
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
              onDelete={handleDeleteFolder}
            />
          ))}
        </div>

        {/* Notes List */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <div className="px-4 mb-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {selectedFolder === 'all' ? 'Todas as Notas' : `${selectedFolder}`}
              </h4>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {filteredNotes.length}
              </span>
            </div>
          </div>
          
          <div className="px-4">
            <DraggableNotesList
              notes={filteredNotes}
              selectedFolder={selectedFolder}
              selectedNote={selectedNote}
              setSelectedNote={setSelectedNote}
              onNotesUpdate={onNotesUpdate || (() => {})}
              onCheckUnsavedChanges={onCheckUnsavedChanges}
            />
          </div>
        </div>
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4 shadow-2xl">
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
              autoFocus
            />
            
            <div className="flex space-x-3">
              <button
                onClick={handleNewFolder}
                disabled={!newFolderName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Criar
              </button>
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName('');
                }}
                className="flex-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-4 py-2 font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
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