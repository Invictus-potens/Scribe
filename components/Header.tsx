
'use client';

import { useEffect, useState } from 'react';
import { useI18n } from './I18nProvider';
import { authHelpers } from '../lib/supabase';
import { companyHelpers, type CompanyMember } from '../lib/companyHelpers';

interface HeaderProps {
  activeView: string;
  setActiveView: (view: string) => void;
  darkMode: boolean;
  toggleTheme: () => void;
  autoRefreshMs?: number;
  setAutoRefreshMs?: (ms: number) => void;
  onLogout: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export default function Header({ 
  activeView, 
  setActiveView, 
  darkMode, 
  toggleTheme, 
  autoRefreshMs,
  setAutoRefreshMs,
  onLogout,
  searchTerm,
  setSearchTerm 
}: HeaderProps) {
  const { t, lang, setLang } = useI18n();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [invitations, setInvitations] = useState<CompanyMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<Record<string, 'accept' | 'decline' | null>>({});
  const [accentTheme, setAccentTheme] = useState<string>(() => {
    if (typeof window === 'undefined') return 'blue';
    return localStorage.getItem('settings:accentTheme') || 'blue';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    // Remove all known accent classes
    root.classList.remove('theme-accent-orange');
    root.classList.remove('theme-accent-gold');
    root.classList.remove('theme-accent-mint');
    root.classList.remove('theme-accent-red');
    root.classList.remove('theme-accent-orchid');
    // Apply selected accent
    if (accentTheme === 'orange') {
      root.classList.add('theme-accent-orange');
    } else if (accentTheme === 'gold') {
      root.classList.add('theme-accent-gold');
    } else if (accentTheme === 'mint') {
      root.classList.add('theme-accent-mint');
    } else if (accentTheme === 'red') {
      root.classList.add('theme-accent-red');
    } else if (accentTheme === 'orchid') {
      root.classList.add('theme-accent-orchid');
    }
  }, [accentTheme]);

  useEffect(() => {
    const loadInvites = async () => {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) return;
      setCurrentUserId(user.id);
      const { data } = await companyHelpers.getUserInvitations(user.id);
      setInvitations(data || []);
    };
    loadInvites();
  }, []);

  const handleInvitationAction = async (
    invitation: CompanyMember,
    action: 'accept' | 'decline'
  ) => {
    if (!currentUserId) return;
    setProcessing(prev => ({ ...prev, [invitation.id]: action }));
    try {
      if (action === 'accept') {
        const { error } = await companyHelpers.acceptInvitation(
          invitation.company_id,
          currentUserId
        );
        if (error) throw error;
      } else {
        const { error } = await companyHelpers.declineInvitation(
          invitation.company_id,
          currentUserId
        );
        if (error) throw error;
      }
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
    } catch (err) {
      // Optional: show a simple feedback. Keep minimal per request.
      console.error('Invitation action failed', err);
    } finally {
      setProcessing(prev => ({ ...prev, [invitation.id]: null }));
    }
  };

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
                    title="Fechar notificações"
                    aria-label="Fechar notificações"
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
                        <button
                          onClick={() => handleInvitationAction(inv, 'accept')}
                          disabled={!!processing[inv.id]}
                          className={`px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded ${processing[inv.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Aceitar"
                        >
                          {processing[inv.id] === 'accept' ? 'Aceitando...' : 'Aceitar'}
                        </button>
                        <button
                          onClick={() => handleInvitationAction(inv, 'decline')}
                          disabled={!!processing[inv.id]}
                          className={`px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded ${processing[inv.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Recusar"
                        >
                          {processing[inv.id] === 'decline' ? 'Recusando...' : 'Recusar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="relative">
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Configurações"
            >
              <i className="ri-settings-3-line w-5 h-5 flex items-center justify-center text-gray-600 dark:text-gray-400"></i>
            </button>
            {showSettings && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-800 dark:text-gray-200">{t('settings.title')}</span>
                  <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title={t('settings.close')} aria-label={t('settings.close')}>
                    <i className="ri-close-line w-4 h-4"></i>
                  </button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">{t('settings.darkTheme')}</span>
                    <button onClick={toggleTheme} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                      {darkMode ? t('common.active') : t('common.inactive')}
                    </button>
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1" htmlFor="accent-select">{t('settings.themeAccent') || 'Cor do tema'}</label>
                    <select
                      id="accent-select"
                      value={accentTheme}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAccentTheme(v);
                        try { localStorage.setItem('settings:accentTheme', v); } catch {}
                      }}
                      className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-gray-800 dark:text-gray-200"
                    >
                      <option value="blue">Blue (padrão)</option>
                      <option value="orange">Orange</option>
                      <option value="gold">Gold</option>
                      <option value="mint">Mint</option>
                      <option value="red">Red</option>
                      <option value="orchid">Orchid</option>
                    </select>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-block w-5 h-5 rounded bg-blue-600"></span>
                      <span className="inline-block w-5 h-5 rounded bg-orange-500"></span>
                      <span className="inline-block w-5 h-5 rounded bg-ff8c00"></span>
                      <span className="inline-block w-5 h-5 rounded bg-eee8aa"></span>
                      <span className="inline-block w-5 h-5 rounded bg-f5fffa"></span>
                      <span className="inline-block w-5 h-5 rounded bg-ff0000"></span>
                      <span className="inline-block w-5 h-5 rounded bg-da70d6"></span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1">{t('settings.autoRefresh')}</label>
                    <label className="sr-only" htmlFor="auto-refresh-select">{t('settings.autoRefresh')}</label>
                    <select
                      id="auto-refresh-select"
                      value={autoRefreshMs ?? 30000}
                      onChange={(e) => setAutoRefreshMs && setAutoRefreshMs(Number(e.target.value))}
                      className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-gray-800 dark:text-gray-200"
                    >
                      <option value={0}>{t('refresh.off')}</option>
                      <option value={15000}>{t('refresh.15s')}</option>
                      <option value={30000}>{t('refresh.30s')}</option>
                      <option value={60000}>{t('refresh.1m')}</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">{t('settings.doNotDisturb')}</span>
                    <button
                      onClick={(e) => {
                        const key = 'settings:dnd';
                        const current = localStorage.getItem(key) === 'true';
                        localStorage.setItem(key, String(!current));
                        // Quick feedback visual
                        const target = e.currentTarget as HTMLElement;
                        target.classList.add('ring-2');
                        setTimeout(() => target.classList.remove('ring-2'), 300);
                      }}
                      className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                    >
                      {typeof window !== 'undefined' && localStorage.getItem('settings:dnd') === 'true' ? t('common.active') : t('common.inactive')}
                    </button>
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1" htmlFor="language-select">{t('settings.language')}</label>
                    <select
                      id="language-select"
                      value={lang}
                      onChange={(e) => setLang(e.target.value as any)}
                      className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-gray-800 dark:text-gray-200"
                    >
                      <option value="pt-BR">{t('lang.pt')}</option>
                      <option value="en">{t('lang.en')}</option>
                    </select>
                  </div>
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
