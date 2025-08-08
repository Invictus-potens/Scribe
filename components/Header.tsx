
'use client';

import { useEffect, useState } from 'react';
import { authHelpers } from '../lib/supabase';
import { companyHelpers } from '../lib/companyHelpers';

interface HeaderProps {
  activeView: string;
  setActiveView: (view: string) => void;
  darkMode: boolean;
  toggleTheme: () => void;
  onLogout: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export default function Header({ 
  activeView, 
  setActiveView, 
  darkMode, 
  toggleTheme, 
  onLogout,
  searchTerm,
  setSearchTerm 
}: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [invitations, setInvitations] = useState<any[]>([]);

  useEffect(() => {
    const loadInvites = async () => {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) return;
      const { data } = await companyHelpers.getUserInvitations(user.id);
      setInvitations(data || []);
    };
    loadInvites();
  }, []);

  const views = [
    { id: 'notes', label: 'Notes', icon: 'ri-file-text-line' },
    { id: 'kanban', label: 'Kanban', icon: 'ri-kanban-view' },
    { id: 'calendar', label: 'Calendar', icon: 'ri-calendar-line' },
    { id: 'ai', label: 'AI Assistant', icon: 'ri-robot-line' },
    { id: 'companies', label: 'Empresas', icon: 'ri-building-line' }
  ];

  return (
    <header className="header-height bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 content-padding-x flex items-center flex-shrink-0">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-responsive-lg">
          <h1 className="text-responsive-2xl font-bold text-gray-800 dark:text-white font-pacifico">Scribe</h1>
          
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
            >
              <i className={`${views.find(v => v.id === activeView)?.icon} w-5 h-5 flex items-center justify-center`}></i>
              <span className="text-gray-700 dark:text-gray-200">{views.find(v => v.id === activeView)?.label}</span>
              <i className="ri-arrow-down-s-line w-4 h-4 flex items-center justify-center"></i>
            </button>

            {showDropdown && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                {views.map(view => (
                  <button
                    key={view.id}
                    onClick={() => {
                      setActiveView(view.id);
                      setShowDropdown(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap ${
                      activeView === view.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <i className={`${view.icon} w-5 h-5 flex items-center justify-center`}></i>
                    <span>{view.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {activeView === 'notes' && (
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 flex items-center justify-center"></i>
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300 text-sm w-64"
              />
            </div>
          )}

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
              title="Notificações"
            >
              <i className="ri-notification-3-line w-5 h-5 flex items-center justify-center text-gray-600 dark:text-gray-400"></i>
              {invitations.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full">
                  {invitations.length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <span className="font-medium text-gray-800 dark:text-gray-200">Notificações</span>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <i className="ri-close-line w-4 h-4"></i>
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {invitations.length === 0 && (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Sem novas notificações</div>
                  )}
                  {invitations.map((inv) => (
                    <div key={inv.id} className="px-4 py-3 border-b last:border-b-0 border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-800 dark:text-gray-200">Convite para empresa</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Status: {inv.status}</div>
                      <div className="flex items-center space-x-2">
                        <button className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded" title="Aceitar">
                          Aceitar
                        </button>
                        <button className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded" title="Recusar">
                          Recusar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={darkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
          >
            <i className={`${darkMode ? 'ri-sun-line' : 'ri-moon-line'} w-5 h-5 flex items-center justify-center text-gray-600 dark:text-gray-400`}></i>
          </button>

          <button
            onClick={onLogout}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Sair"
          >
            <i className="ri-logout-circle-line w-5 h-5 flex items-center justify-center text-gray-600 dark:text-gray-400"></i>
          </button>
        </div>
      </div>
    </header>
  );
}
