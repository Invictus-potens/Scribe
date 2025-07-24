
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
      const { session } = await authHelpers.getSession();
      if (session) {
        setIsAuthenticated(true);
      }
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setIsAuthenticated(true);
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
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
    await authHelpers.signOut();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-800 dark:text-white mb-4">Scribe</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">Your Ultimate Productivity Workspace</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap"
          >
            Get Started
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
