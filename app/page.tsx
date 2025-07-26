/*
oooooooooooi
 * * 
 * * Data de conclusão: 25/07/2025
 * */


'use client';

import { useState, useEffect } from 'react';
import { supabase, authHelpers } from '../lib/supabase';
import { useResponsive } from '../lib/useResponsive';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import NotesEditor from '../components/NotesEditor';
import KanbanBoard from '../components/KanbanBoard';
import Calendar from '../components/Calendar';
import AIAssistant from '../components/AIAssistant';
import AuthModal from '../components/AuthModal';
import ResponsiveDebug from '../components/ResponsiveDebug';

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
  const [notesUpdateTrigger, setNotesUpdateTrigger] = useState(0);
  const [notes, setNotes] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

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
    // Trigger notes update in sidebar
    setNotesUpdateTrigger(prev => prev + 1);
  };

  const checkUnsavedChanges = (action: () => void) => {
    if (hasUnsavedChanges) {
      // Mostrar modal e executar ação após confirmação
      setPendingAction(() => async () => {
        // Executar a ação diretamente
        action();
      });
      setShowUnsavedModal(true);
    } else {
      action();
    }
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
    <div className="min-h-screen">
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        <Header 
          activeView={activeView}
          setActiveView={setActiveView}
          darkMode={darkMode}
          toggleTheme={toggleTheme}
          onLogout={handleLogout}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        
        <div className="flex">
          {activeView === 'notes' && (
            <Sidebar 
              selectedFolder={selectedFolder}
              setSelectedFolder={setSelectedFolder}
              activeView={activeView}
              selectedNote={selectedNote}
              setSelectedNote={setSelectedNote}
              searchTerm={searchTerm}
              onNotesUpdate={() => setNotesUpdateTrigger(prev => prev + 1)}
              onNotesLoaded={setNotes}
              hasUnsavedChanges={hasUnsavedChanges}
              onCheckUnsavedChanges={checkUnsavedChanges}
            />
          )}
          
          <main className={`${activeView === 'notes' ? 'flex-1' : 'w-full'} content-padding`}>
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
      </div>

      {/* Modal Global de Mudanças Não Salvas */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4">
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
      
      {/* Debug component - set show={true} to enable */}
      <ResponsiveDebug show={false} />
    </div>
  );
}
