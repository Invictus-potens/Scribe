'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

type LanguageCode = 'pt-BR' | 'en';

type Translations = Record<string, string>;

const DICTS: Record<LanguageCode, Translations> = {
  'pt-BR': {
    'settings.title': 'Configurações',
    'settings.close': 'Fechar configurações',
    'settings.darkTheme': 'Tema escuro',
    'settings.autoRefresh': 'Auto-refresh das notas',
    'settings.doNotDisturb': 'Não perturbe (toasts)',
    'settings.language': 'Idioma',
    'lang.pt': 'Português (Brasil)',
    'lang.en': 'Inglês',
    'common.active': 'Ativo',
    'common.inactive': 'Inativo',
    'refresh.off': 'Desligado',
    'refresh.15s': '15 segundos',
    'refresh.30s': '30 segundos',
    'refresh.1m': '1 minuto',
    'editor.loading': 'Carregando editor......',
    'editor.titlePlaceholder': 'Título da nota...',
    'editor.unpin': 'Desafixar nota',
    'editor.pin': 'Fixar nota',
    'editor.unfavorite': 'Remover dos favoritos',
    'editor.favorite': 'Adicionar aos favoritos',
    'editor.unarchive': 'Desarquivar',
    'editor.archive': 'Arquivar',
    'editor.toggleSplit': 'Alternar visualização dividida',
    'editor.templates': 'Modelos',
    'editor.exportMarkdown': 'Exportar Markdown',
    'editor.exportHtml': 'Exportar HTML',
    'editor.exportPdf': 'Exportar PDF',
    'editor.exportZip': 'Exportar ZIP (MD+HTML)',
    'editor.importMdHtml': 'Importar Markdown/HTML',
    'editor.delete': 'Deletar nota',
    'editor.save': 'Salvar',
    'editor.saveWithStar': 'Salvar*',
    'sidebar.newNote': 'Nova nota',
    'sidebar.newFolder': 'Nova Pasta',
    'sidebar.filterFavorites': 'Filtrar favoritos',
    'sidebar.favorites': 'Favoritos',
    'sidebar.showArchived': 'Mostrar arquivadas',
    'sidebar.archived': 'Arquivadas',
    'sidebar.onlyPinned': 'Somente fixadas',
    'sidebar.pinned': 'Fixadas',
    'sidebar.tagsPlaceholder': 'Tags (separe por vírgula)',
    'sidebar.folders': 'Pastas',
    'sidebar.allNotes': 'Todas as Notas',
    'sidebar.folderNamePlaceholder': 'Nome da pasta',
    'sidebar.create': 'Criar',
    'sidebar.cancel': 'Cancelar',
    'toast.addedToFavorites': 'Adicionada aos favoritos',
    'toast.removedFromFavorites': 'Removida dos favoritos',
    'toast.archived': 'Nota arquivada',
    'toast.unarchived': 'Nota desarquivada',
    'toast.noteDeleted': 'Nota deletada',
    'error.updateNote': 'Erro ao atualizar a nota',
    'error.createNote': 'Erro ao criar a nota',
    'error.unexpectedSave': 'Erro inesperado ao salvar a nota',
    'error.updateFavorite': 'Erro ao atualizar favorito',
    'error.updateArchived': 'Erro ao atualizar arquivamento',
    'error.unknown': 'Erro desconhecido',
    'error.deleteNote': 'Erro ao deletar a nota',
    'error.unexpectedDeleteNote': 'Erro inesperado ao deletar a nota',
    'confirm.deleteNote.title': 'Deletar nota',
    'confirm.deleteNote.description': 'Tem certeza que deseja deletar esta nota? Esta ação não pode ser desfeita.',
    'common.delete': 'Deletar',
    'common.cancel': 'Cancelar',
    'loading.title': 'Carregando...',
    'loading.subtitle': 'Preparando seu workspace',
    'unauth.subtitle': 'Seu Workspace de Produtividade Definitivo',
    'unauth.cta': 'Começar',
    'unsaved.title': 'Mudanças Não Salvas',
    'unsaved.message': 'Você tem mudanças não salvas nesta nota. O que você gostaria de fazer?',
    'unsaved.saveAndContinue': 'Salvar e Continuar',
    'unsaved.discard': 'Descartar Mudanças',
    'sync.indicator': 'Sincronizando...',
    'errorBanner.reload': 'Recarregar',
  },
  en: {
    'settings.title': 'Settings',
    'settings.close': 'Close settings',
    'settings.darkTheme': 'Dark theme',
    'settings.autoRefresh': 'Notes auto-refresh',
    'settings.doNotDisturb': 'Do not disturb (toasts)',
    'settings.language': 'Language',
    'lang.pt': 'Portuguese (Brazil)',
    'lang.en': 'English',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'refresh.off': 'Off',
    'refresh.15s': '15 seconds',
    'refresh.30s': '30 seconds',
    'refresh.1m': '1 minute',
    'editor.loading': 'Loading editor...',
    'editor.titlePlaceholder': 'Note title...',
    'editor.unpin': 'Unpin note',
    'editor.pin': 'Pin note',
    'editor.unfavorite': 'Remove from favorites',
    'editor.favorite': 'Add to favorites',
    'editor.unarchive': 'Unarchive',
    'editor.archive': 'Archive',
    'editor.toggleSplit': 'Toggle split view',
    'editor.templates': 'Templates',
    'editor.exportMarkdown': 'Export Markdown',
    'editor.exportHtml': 'Export HTML',
    'editor.exportPdf': 'Export PDF',
    'editor.exportZip': 'Export ZIP (MD+HTML)',
    'editor.importMdHtml': 'Import Markdown/HTML',
    'editor.delete': 'Delete note',
    'editor.save': 'Save',
    'editor.saveWithStar': 'Save*',
    'sidebar.newNote': 'New note',
    'sidebar.newFolder': 'New Folder',
    'sidebar.filterFavorites': 'Filter favorites',
    'sidebar.favorites': 'Favorites',
    'sidebar.showArchived': 'Show archived',
    'sidebar.archived': 'Archived',
    'sidebar.onlyPinned': 'Only pinned',
    'sidebar.pinned': 'Pinned',
    'sidebar.tagsPlaceholder': 'Tags (comma separated)',
    'sidebar.folders': 'Folders',
    'sidebar.allNotes': 'All Notes',
    'sidebar.folderNamePlaceholder': 'Folder name',
    'sidebar.create': 'Create',
    'sidebar.cancel': 'Cancel',
    'toast.addedToFavorites': 'Added to favorites',
    'toast.removedFromFavorites': 'Removed from favorites',
    'toast.archived': 'Note archived',
    'toast.unarchived': 'Note unarchived',
    'toast.noteDeleted': 'Note deleted',
    'error.updateNote': 'Error updating note',
    'error.createNote': 'Error creating note',
    'error.unexpectedSave': 'Unexpected error while saving the note',
    'error.updateFavorite': 'Error updating favorite',
    'error.updateArchived': 'Error updating archived status',
    'error.unknown': 'Unknown error',
    'error.deleteNote': 'Error deleting note',
    'error.unexpectedDeleteNote': 'Unexpected error while deleting the note',
    'confirm.deleteNote.title': 'Delete note',
    'confirm.deleteNote.description': 'Are you sure you want to delete this note? This action cannot be undone.',
    'common.delete': 'Delete',
    'common.cancel': 'Cancel',
    'loading.title': 'Loading...',
    'loading.subtitle': 'Preparing your workspace',
    'unauth.subtitle': 'Your ultimate productivity workspace',
    'unauth.cta': 'Get started',
    'unsaved.title': 'Unsaved Changes',
    'unsaved.message': 'You have unsaved changes in this note. What would you like to do?',
    'unsaved.saveAndContinue': 'Save and Continue',
    'unsaved.discard': 'Discard Changes',
    'sync.indicator': 'Syncing...',
    'errorBanner.reload': 'Reload',
  },
};

interface I18nContextValue {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<LanguageCode>(() => {
    if (typeof window === 'undefined') return 'pt-BR';
    const saved = window.localStorage.getItem('settings:lang') as LanguageCode | null;
    return saved === 'en' ? 'en' : 'pt-BR';
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('settings:lang', lang);
    } catch {}
  }, [lang]);

  const t = useCallback((key: string) => {
    const dict = DICTS[lang] || DICTS['pt-BR'];
    return dict[key] ?? key;
  }, [lang]);

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t }), [lang, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}


