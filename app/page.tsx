/*
 * Scribe - Workspace de Produtividade
 * Data de conclusão: 25/07/2025
 * Versão Otimizada com Auto-Update de Notas
 */

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
  DragStartEvent,
  DragOverlay as DndKitDragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase, authHelpers } from '../lib/supabase';
import { useResponsive } from '../lib/useResponsive';
import { useNotesManager } from '../lib/useNotesManager';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import NotesEditor from '../components/NotesEditor';
import KanbanBoard from '../components/KanbanBoard';
import Calendar from '../components/Calendar';
import AIAssistant from '../components/AIAssistant';
import AuthModal from '../components/AuthModal';
import ResponsiveDebug from '../components/ResponsiveDebug';
import ScaleControl from '../components/ScaleControl';
import DragOverlay from '../components/DragOverlay';

export default function Home() {
  const screenSize = useResponsive();
  const [activeView, setActiveView] = useState('notes');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Hook personalizado para gerenciar notas com auto-update
  const {
    notes,
    loading: notesLoading,
    error: notesError,
    moveNoteToFolder,
    reorderNotes,
    refresh: refreshNotes,
  } = useNotesManager({
    autoRefreshInterval: 30000, // Auto-refresh a cada 30 segundos
    onNotesLoaded: (loadedNotes) => {
      console.log('Home: notas carregadas via hook:', loadedNotes.length);
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requer movimento de 8px para iniciar drag
      }
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { session } = await authHelpers.getSession();
        if (session) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session) {
          setIsAuthenticated(true);
          setShowAuthModal(false);
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setSelectedNote(null);
          setSelectedFolder('all');
          setSearchTerm('');
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setIsAuthenticated(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => {
    const newTheme = !darkMode;
    setDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogin = () => {
    setShowAuthModal(true);
  };

  const handleLogout = async () => {
    try {
      await authHelpers.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNoteSaved = () => {
    // Refresh notes after saving
    refreshNotes();
  };

  const checkUnsavedChanges = (action: () => void) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => action);
      setShowUnsavedModal(true);
    } else {
      action();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    
    // Add visual feedback to the dragged element
    const draggedElement = document.querySelector(`[data-note-id="${event.active.id}"]`);
    if (draggedElement) {
      draggedElement.setAttribute('data-dragging', 'true');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    // Remove visual feedback
    const draggedElement = document.querySelector(`[data-note-id="${active.id}"]`);
    if (draggedElement) {
      draggedElement.setAttribute('data-dragging', 'false');
    }

    console.log('handleDragEnd chamado:', { 
      active: active.id, 
      over: over?.id, 
      overType: over?.data?.current?.type 
    });

    if (!over) return;

    // Se arrastou uma nota para uma pasta
    if (over.data?.current?.type === 'folder' && active.data?.current?.type === 'note') {
      const folderName = over.data.current.folderName;
      const noteId = active.id as string;
      
      console.log(`Movendo nota ${noteId} para pasta: ${folderName}`);
      
      const success = await moveNoteToFolder(
        noteId, 
        folderName === 'all' ? undefined : folderName
      );
      
      if (success) {
        // Feedback visual de sucesso
        const movedNote = document.querySelector(`[data-note-id="${noteId}"]`);
        if (movedNote) {
          movedNote.classList.add('moving');
          setTimeout(() => {
            movedNote.classList.remove('moving');
          }, 400);
        }

        // Adicionar classe de sucesso temporariamente
        const targetFolder = document.querySelector(`[id="${over.id}"]`);
        if (targetFolder) {
          targetFolder.classList.add('drop-success');
          setTimeout(() => {
            targetFolder.classList.remove('drop-success');
          }, 600);
        }
      }
    }
    // Se arrastou para reordenar dentro da mesma pasta
    else if (active.id !== over.id && active.data?.current?.type === 'note' && over.data?.current?.type === 'note') {
      const oldIndex = notes.findIndex(note => note.id === active.id);
      const newIndex = notes.findIndex(note => note.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        console.log(`Reordenando nota de posição ${oldIndex} para ${newIndex}`);
        
        const success = await reorderNotes(oldIndex, newIndex);
        
        if (success) {
          // Feedback visual de sucesso
          const movedNoteElement = document.querySelector(`[data-note-id="${active.id}"]`);
          if (movedNoteElement) {
            movedNoteElement.classList.add('moving');
            setTimeout(() => {
              movedNoteElement.classList.remove('moving');
            }, 400);
          }
        }
      }
    }
  };

  const handleDragOver = (event: any) => {
    const { over } = event;
    
    // Add visual feedback to drop zones
    if (over?.data?.current?.type === 'folder') {
      const folderElement = document.querySelector(`[id="${over.id}"]`);
      if (folderElement && !folderElement.classList.contains('folder-drop-hover')) {
        folderElement.classList.add('folder-drop-hover');
      }
    }
  };

  const handleDragLeave = (event: any) => {
    // Remove visual feedback from drop zones
    const allFolders = document.querySelectorAll('.folder-drop-hover');
    allFolders.forEach(folder => {
      folder.classList.remove('folder-drop-hover');
    });
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center content-padding">
        <div className="text-center max-w-2xl mx-auto">
          <div className="w-responsive-xl h-responsive-xl bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-loader-4-line w-responsive-lg h-responsive-lg text-white animate-spin"></i>
          </div>
          <h2 className="text-responsive-2xl font-bold text-gray-800 dark:text-white mb-2">
            Carregando...
          </h2>
          <p className="text-responsive-base text-gray-600 dark:text-gray-400">
            Preparando seu workspace
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center content-padding">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-responsive-5xl font-bold text-gray-800 dark:text-white mb-4">Scribe</h1>
          <p className="text-responsive-xl text-gray-600 dark:text-gray-300 mb-8">Seu Workspace de Produtividade Definitivo</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-responsive-xl py-responsive-md rounded-lg font-semibold transition-colors whitespace-nowrap text-responsive-lg"
          >
            Começar
          </button>
        </div>
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)} 
            onLogin={handleLogin}
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Header 
        activeView={activeView}
        setActiveView={setActiveView}
        darkMode={darkMode}
        toggleTheme={toggleTheme}
        onLogout={handleLogout}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragCancel={handleDragLeave}
      >
        <div className="flex flex-1 overflow-hidden">
          {activeView === 'notes' && (
            <Sidebar 
              selectedFolder={selectedFolder}
              setSelectedFolder={setSelectedFolder}
              activeView={activeView}
              selectedNote={selectedNote}
              setSelectedNote={setSelectedNote}
              searchTerm={searchTerm}
              onNotesUpdate={refreshNotes}
              onNotesLoaded={() => {}} // Já gerenciado pelo hook
              hasUnsavedChanges={hasUnsavedChanges}
              onCheckUnsavedChanges={checkUnsavedChanges}
              notes={notes} // Passar as notas do hook
            />
          )}
          
          <main className={`${activeView === 'notes' ? 'flex-1' : 'w-full'} content-padding overflow-auto`}>
            {activeView === 'notes' && (
              <NotesEditor 
                selectedFolder={selectedFolder}
                selectedNote={selectedNote}
                setSelectedNote={setSelectedNote}
                searchTerm={searchTerm}
                onNoteSaved={handleNoteSaved}
                notes={notes}
                hasUnsavedChanges={hasUnsavedChanges}
                setHasUnsavedChanges={setHasUnsavedChanges}
                onUnsavedChangesConfirm={() => {
                  if (pendingAction) {
                    pendingAction();
                    setPendingAction(null);
                    setShowUnsavedModal(false);
                    setHasUnsavedChanges(false);
                  }
                }}
                onUnsavedChangesCancel={() => {
                  setPendingAction(null);
                  setShowUnsavedModal(false);
                }}
              />
            )}
            {activeView === 'kanban' && <KanbanBoard />}
            {activeView === 'calendar' && <Calendar />}
            {activeView === 'ai' && <AIAssistant />}
          </main>
        </div>

        {/* Drag Overlay com melhor feedback visual */}
        <DndKitDragOverlay>
          {activeDragId ? (
            <div className="drag-overlay">
              <DragOverlay 
                note={notes.find(note => note.id === activeDragId) || {
                  id: '',
                  title: '',
                  content: '',
                }}
              />
            </div>
          ) : null}
        </DndKitDragOverlay>
      </DndContext>

      {/* Notificação de erro das notas */}
      {notesError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <i className="ri-error-warning-line w-4 h-4"></i>
            <span className="text-sm">{notesError}</span>
            <button
              onClick={() => window.location.reload()}
              className="ml-2 text-xs underline hover:no-underline"
            >
              Recarregar
            </button>
          </div>
        </div>
      )}

      {/* Modal Global de Mudanças Não Salvas */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mr-3">
                <i className="ri-alert-line w-5 h-5 text-yellow-600 dark:text-yellow-400"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Mudanças Não Salvas
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Você tem mudanças não salvas nesta nota. O que você gostaria de fazer?
            </p>
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => {
                  setHasUnsavedChanges(false);
                  if (pendingAction) {
                    pendingAction();
                    setPendingAction(null);
                  }
                  setShowUnsavedModal(false);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Salvar e Continuar
              </button>
              <button
                onClick={() => {
                  setHasUnsavedChanges(false);
                  if (pendingAction) {
                    pendingAction();
                    setPendingAction(null);
                  }
                  setShowUnsavedModal(false);
                }}
                className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Descartar Mudanças
              </button>
              <button
                onClick={() => {
                  setPendingAction(null);
                  setShowUnsavedModal(false);
                }}
                className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-4 py-2 font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Indicador de sincronização */}
      {notesLoading && (
        <div className="fixed top-20 right-4 bg-blue-500 text-white px-3 py-1 rounded-full shadow-lg z-40 flex items-center space-x-2">
          <i className="ri-loader-4-line w-3 h-3 animate-spin"></i>
          <span className="text-xs">Sincronizando...</span>
        </div>
      )}
      
      {/* Debug component - set show={true} to enable */}
      <ResponsiveDebug show={false} />
      
      {/* Scale Control - set show={true} to enable */}
      <ScaleControl show={false} />
    </div>
  );
}