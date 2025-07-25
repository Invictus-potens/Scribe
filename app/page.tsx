
'use client';

import { useState, useEffect } from 'react';
import { supabase, authHelpers } from '../lib/supabase';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import NotesEditor from '../components/NotesEditor';
import KanbanBoard from '../components/KanbanBoard';
import Calendar from '../components/Calendar';
import AIAssistant from '../components/AIAssistant';
import AuthModal from '../components/AuthModal';

export default function Home() {
  const [activeView, setActiveView] = useState('notes');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
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
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
  };

  const handleLogout = async () => {
    try {
      await authHelpers.signOut();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-loader-4-line w-8 h-8 text-white animate-spin"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Carregando...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Preparando seu workspace
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-800 dark:text-white mb-4">Scribe</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">Seu Workspace de Produtividade Definitivo</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap"
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
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
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
          <Sidebar 
            selectedFolder={selectedFolder}
            setSelectedFolder={setSelectedFolder}
            activeView={activeView}
            selectedNote={selectedNote}
            setSelectedNote={setSelectedNote}
            searchTerm={searchTerm}
          />
          
          <main className="flex-1 p-6">
            {activeView === 'notes' && (
              <NotesEditor 
                selectedFolder={selectedFolder}
                selectedNote={selectedNote}
                setSelectedNote={setSelectedNote}
                searchTerm={searchTerm}
              />
            )}
            {activeView === 'kanban' && <KanbanBoard />}
            {activeView === 'calendar' && <Calendar />}
            {activeView === 'ai' && <AIAssistant />}
          </main>
        </div>
      </div>
    </div>
  );
}
