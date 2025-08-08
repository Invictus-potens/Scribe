import { useState, useCallback, useRef, useEffect } from 'react';
import { notesHelpers, authHelpers, Note } from './supabase';

interface UseNotesManagerOptions {
  onNotesLoaded?: (notes: Note[]) => void;
  autoRefreshInterval?: number; // em milissegundos
}

export function useNotesManager(options: UseNotesManagerOptions = {}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isReloadingRef = useRef(false);
  const lastUpdateRef = useRef<number>(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { onNotesLoaded, autoRefreshInterval = 0 } = options;

  // Função para carregar notas do Supabase
  const loadNotes = useCallback(async (force = false) => {
    // Evitar múltiplas chamadas simultâneas
    if (isReloadingRef.current && !force) {
      console.log('useNotesManager: loadNotes já em execução, pulando...');
      return notes;
    }

    // Throttling: evitar recarregar muito frequentemente
    const now = Date.now();
    if (!force && now - lastUpdateRef.current < 1000) {
      console.log('useNotesManager: throttling loadNotes');
      return notes;
    }

    isReloadingRef.current = true;
    lastUpdateRef.current = now;

    try {
      setError(null);
      
      const { user } = await authHelpers.getCurrentUser();
      if (!user) {
        setNotes([]);
        return [];
      }

      console.log('useNotesManager: carregando notas...');
      const { data: notesData, error: notesError } = await notesHelpers.getNotes(user.id);
      
      if (notesError) {
        console.error('Error loading notes:', notesError);
        setError(`Erro ao carregar notas: ${notesError.message}`);
        return notes;
      }

      console.log('useNotesManager: notas carregadas do banco:', notesData);
      
      const sortedNotes = (notesData || []).sort((a, b) => {
        // Pinned notes first
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        
        // Then by position (if available) or updated_at
        if (a.position !== undefined && b.position !== undefined) {
          return a.position - b.position;
        }
        
        return new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime();
      });

      console.log('useNotesManager: notas carregadas, total:', sortedNotes.length);
      console.log('useNotesManager: pastas das notas:', sortedNotes.map(note => ({ title: note.title, folder: note.folder })));
      setNotes(sortedNotes);
      
      if (onNotesLoaded) {
        onNotesLoaded(sortedNotes);
      }

      return sortedNotes;
    } catch (error) {
      console.error('Error loading notes:', error);
      setError('Erro inesperado ao carregar notas');
      return notes;
    } finally {
      isReloadingRef.current = false;
      setLoading(false);
    }
  }, [notes, onNotesLoaded]);

  // Função para atualizar uma nota localmente (otimistic update)
  const updateNoteLocal = useCallback((noteId: string, updates: Partial<Note>) => {
    setNotes(currentNotes => 
      currentNotes.map(note => 
        note.id === noteId 
          ? { ...note, ...updates, updated_at: new Date().toISOString() }
          : note
      )
    );
  }, []);

  // Função para mover uma nota para uma pasta
  const moveNoteToFolder = useCallback(async (noteId: string, folderName: string | undefined) => {
    try {
      // Update local state immediately (optimistic update)
      updateNoteLocal(noteId, { folder: folderName });

      const { user } = await authHelpers.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const noteToUpdate = notes.find(note => note.id === noteId);
      if (!noteToUpdate) throw new Error('Note not found');

      const updatedNote = {
        ...noteToUpdate,
        folder: folderName,
      };

      const { error } = await notesHelpers.updateNote(noteId, updatedNote);
      if (error) {
        // Revert optimistic update on error
        updateNoteLocal(noteId, { folder: noteToUpdate.folder });
        throw error;
      }

      console.log('useNotesManager: nota movida com sucesso para:', folderName || 'Todas as Notas');
      
      // Refresh notes after a short delay to ensure consistency
      setTimeout(() => loadNotes(), 500);
      
      return true;
    } catch (error) {
      console.error('Error moving note:', error);
      setError(`Erro ao mover nota: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return false;
    }
  }, [notes, updateNoteLocal, loadNotes]);

  // Função para reordenar notas
  const reorderNotes = useCallback(async (oldIndex: number, newIndex: number) => {
    try {
      // Update local state immediately (optimistic update)
      const newOrder = [...notes];
      const [movedNote] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, movedNote);
      setNotes(newOrder);

      const { user } = await authHelpers.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Update positions in database
      const updatePromises = newOrder.map((note, index) => {
        const newPosition = index + 1;
        return notesHelpers.updateNote(note.id, { position: newPosition });
      });

      await Promise.all(updatePromises);
      
      console.log('useNotesManager: notas reordenadas com sucesso');
      
      // Refresh notes after a short delay to ensure consistency
      setTimeout(() => loadNotes(), 500);
      
      return true;
    } catch (error) {
      console.error('Error reordering notes:', error);
      setError(`Erro ao reordenar notas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      // Reload to revert optimistic update
      loadNotes(true);
      return false;
    }
  }, [notes, loadNotes]);

  // Função para refresh manual
  const refresh = useCallback(() => {
    return loadNotes(true);
  }, [loadNotes]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefreshInterval > 0) {
      const setupAutoRefresh = () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        
        refreshTimeoutRef.current = setTimeout(() => {
          loadNotes().then(() => {
            setupAutoRefresh(); // Schedule next refresh
          });
        }, autoRefreshInterval);
      };

      setupAutoRefresh();

      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
      };
    }
  }, [autoRefreshInterval, loadNotes]);

  // Initial load
  useEffect(() => {
    loadNotes(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    notes,
    loading,
    error,
    loadNotes,
    updateNoteLocal,
    moveNoteToFolder,
    reorderNotes,
    refresh,
    isReloading: isReloadingRef.current,
  };
}