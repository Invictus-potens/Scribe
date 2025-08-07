
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlock from '@tiptap/extension-code-block';
import Placeholder from '@tiptap/extension-placeholder';
import DragHandle from '@tiptap/extension-drag-handle';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CharacterCount from '@tiptap/extension-character-count';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Highlight from '@tiptap/extension-highlight';

import Dropcursor from '@tiptap/extension-dropcursor';
import { notesHelpers, Note } from '../lib/supabase';
import { authHelpers } from '../lib/supabase';

// Verificar se estamos no lado do cliente
const isClient = typeof window !== 'undefined';

interface NotesEditorProps {
  selectedFolder: string;
  selectedNote: any;
  setSelectedNote: (note: any) => void;
  searchTerm: string;
  onNoteSaved?: () => void;
  notes?: any[];
  hasUnsavedChanges?: boolean;
  setHasUnsavedChanges?: (hasChanges: boolean) => void;
  onUnsavedChangesConfirm?: () => void;
  onUnsavedChangesCancel?: () => void;
}

export default function NotesEditor({ 
  selectedFolder, 
  selectedNote, 
  setSelectedNote, 
  searchTerm,
  onNoteSaved,
  notes = [],
  hasUnsavedChanges: globalHasUnsavedChanges = false,
  setHasUnsavedChanges: setGlobalHasUnsavedChanges,
  onUnsavedChangesConfirm,
  onUnsavedChangesCancel
}: NotesEditorProps) {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [showSplitView, setShowSplitView] = useState(false);
  const [secondNote, setSecondNote] = useState<any>(null);
  const [showTagInput, setShowTagInput] = useState(false);
  const [localHasUnsavedChanges, setLocalHasUnsavedChanges] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);

  // Usar estado local ou global
  const hasUnsavedChanges = globalHasUnsavedChanges || localHasUnsavedChanges;
  const setHasUnsavedChanges = setGlobalHasUnsavedChanges || setLocalHasUnsavedChanges;

  // Ref para armazenar a função de salvar
  const saveFunctionRef = useRef<(() => Promise<void>) | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Desabilitar extensões que serão configuradas separadamente
        codeBlock: false,
        link: false,
        underline: false, // Desabilitar underline do StarterKit
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'draggable-image',
        },
      }),
      CodeBlock,
      Placeholder.configure({
        placeholder: 'Comece a escrever sua nota...',
      }),
      DragHandle,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CharacterCount,
      TextStyle,
      Color,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Subscript,
      Superscript,
      Highlight.configure({
        multicolor: true,
      }),
      Dropcursor.configure({
        color: '#3b82f6',
        width: 2,
      }),
    ],
    content: '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Marcar que há mudanças não salvas apenas se houver mudanças reais
      const hasRealChanges = checkForRealChanges();
      if (hasRealChanges) {
        setHasUnsavedChanges(true);
      }
    },
  }, [isClient]);

  useEffect(() => {
    if (selectedNote && editor) {
      setTitle(selectedNote.title || '');
      setTags(selectedNote.tags || []);
      setIsPinned(selectedNote.is_pinned || false);
      setHasUnsavedChanges(false);
      
      // Update editor content
      editor.commands.setContent(selectedNote.content || '');
    }
  }, [selectedNote, editor, setHasUnsavedChanges]);

  // Verificar se há mudanças reais comparando com o conteúdo original
  const checkForRealChanges = useCallback(() => {
    if (!selectedNote || !editor) return false;
    
    const currentContent = editor.getHTML();
    const originalContent = selectedNote.content || '';
    const currentTitle = title;
    const originalTitle = selectedNote.title || '';
    const currentTags = JSON.stringify(tags.sort());
    const originalTags = JSON.stringify((selectedNote.tags || []).sort());
    const currentPinned = isPinned;
    const originalPinned = selectedNote.is_pinned || false;
    
    return currentContent !== originalContent || 
           currentTitle !== originalTitle || 
           currentTags !== originalTags || 
           currentPinned !== originalPinned;
  }, [selectedNote, editor, title, tags, isPinned]);

  // Verificar mudanças não salvas ao fechar a página
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Você tem mudanças não salvas. Tem certeza que deseja sair?';
        return 'Você tem mudanças não salvas. Tem certeza que deseja sair?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Verificar mudanças quando título, tags ou pin mudarem
  useEffect(() => {
    if (selectedNote && editor) {
      const hasRealChanges = checkForRealChanges();
      if (hasRealChanges !== hasUnsavedChanges) {
        setHasUnsavedChanges(hasRealChanges);
      }
    }
  }, [checkForRealChanges, hasUnsavedChanges, selectedNote, editor, setHasUnsavedChanges]);
  const handleSave = async () => {
    if (!selectedNote) return;

    try {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      const content = editor?.getHTML() || '';

      const updatedNote = {
        ...selectedNote,
        title,
        content,
        tags,
        is_pinned: isPinned,
        folder: selectedFolder !== 'all' ? selectedFolder : undefined,
      };

      if (selectedNote.id) {
        // Update existing note
        const { data, error } = await notesHelpers.updateNote(selectedNote.id, updatedNote);
        if (error) {
          console.error('Error updating note:', error);
          alert(`Error updating note: ${error.message}`);
          return;
        }
        setSelectedNote(data);
        setHasUnsavedChanges(false);
        if (onNoteSaved) {
          onNoteSaved();
        }
      } else {
        // Create new note
        const { data, error } = await notesHelpers.createNote({
          user_id: user.id,
          title,
          content,
          tags,
          is_pinned: isPinned,
          folder: selectedFolder !== 'all' ? selectedFolder : undefined,
        });
        if (error) {
          console.error('Error creating note:', error);
          alert(`Error creating note: ${error.message}`);
          return;
        }
        setSelectedNote(data);
        setHasUnsavedChanges(false);
        if (onNoteSaved) {
          onNoteSaved();
        }
      }
    } catch (error) {
      console.error('Error saving note:', error);
      alert('An unexpected error occurred while saving the note');
    }
  };

  // Atualizar o ref da função de salvar sempre que handleSave mudar
  useEffect(() => {
    saveFunctionRef.current = handleSave;
  }, [handleSave]);

  const handleSaveContent = async (content: string) => {
    if (!selectedNote || !selectedNote.id) return;

    try {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      const updatedNote = {
        ...selectedNote,
        content,
      };

      const { data, error } = await notesHelpers.updateNote(selectedNote.id, updatedNote);
      if (error) {
        console.error('Error updating note content:', error);
        return;
      }
      setSelectedNote(data);
      setHasUnsavedChanges(false);
      if (onNoteSaved) {
        onNoteSaved();
      }
    } catch (error) {
      console.error('Error saving note content:', error);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setNewTag('');
      setShowTagInput(false);
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    setHasUnsavedChanges(true);
  };

  const checkUnsavedChanges = (action: () => void) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => action);
      setShowSaveModal(true);
    } else {
      action();
    }
  };

  const handleSaveAndContinue = async () => {
    await handleSave();
    setShowSaveModal(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleDiscardChanges = () => {
    setShowSaveModal(false);
    setHasUnsavedChanges(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleCancelAction = () => {
    setShowSaveModal(false);
    setPendingAction(null);
  };

  const handleSaveAndExit = async () => {
    await handleSave();
    setShowExitModal(false);
    if (onUnsavedChangesConfirm) {
      onUnsavedChangesConfirm();
    }
  };

  const handleDiscardAndExit = () => {
    setShowExitModal(false);
    setHasUnsavedChanges(false);
    if (onUnsavedChangesConfirm) {
      onUnsavedChangesConfirm();
    }
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
    if (onUnsavedChangesCancel) {
      onUnsavedChangesCancel();
    }
  };

  if (!selectedNote) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-file-text-line w-16 h-16 flex items-center justify-center text-gray-300 dark:text-gray-600 mx-auto mb-4"></i>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Nenhuma Nota Selecionada</h3>
          <p className="text-gray-500 dark:text-gray-400">Selecione uma nota da barra lateral ou crie uma nova</p>
        </div>
      </div>
    );
  }

  if (!isClient || !editor) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-loader-4-line w-4 h-4 text-white animate-spin"></i>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Carregando editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-semibold bg-transparent border-none focus:outline-none text-gray-800 dark:text-gray-200 flex-1"
            placeholder="Título da nota..."
          />
          {hasUnsavedChanges && (
            <span className="text-orange-500 text-sm ml-2">*</span>
          )}
          <button
            onClick={async () => {
              const newPinnedState = !isPinned;
              setIsPinned(newPinnedState);
              setHasUnsavedChanges(true);
            }}
            className={`p-2 rounded-lg transition-colors ${
              isPinned 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
            title={isPinned ? "Desafixar nota" : "Fixar nota"}
          >
            <i className={`ri-pushpin-${isPinned ? 'fill' : 'line'} w-4 h-4 flex items-center justify-center`}></i>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSplitView(!showSplitView)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Alternar visualização dividida"
          >
            <i className="ri-layout-column-line w-4 h-4 flex items-center justify-center text-gray-600 dark:text-gray-400"></i>
          </button>
          {selectedNote && selectedNote.id && (
            <button
              onClick={() => {
                checkUnsavedChanges(() => {
                  if (confirm('Tem certeza que deseja deletar esta nota?')) {
                    notesHelpers.deleteNote(selectedNote.id).then(({ error }) => {
                      if (error) {
                        console.error('Error deleting note:', error);
                        alert(`Error deleting note: ${error.message}`);
                      } else {
                        setSelectedNote(null);
                        if (onNoteSaved) {
                          onNoteSaved();
                        }
                      }
                    }).catch((error) => {
                      console.error('Error deleting note:', error);
                      alert('An unexpected error occurred while deleting the note');
                    });
                  }
                });
              }}
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 transition-colors text-red-600 dark:text-red-400"
              title="Delete Note"
            >
              <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center"></i>
            </button>
          )}
          <button
            onClick={handleSave}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              hasUnsavedChanges 
                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {hasUnsavedChanges ? 'Salvar*' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* TipTap Toolbar */}
      <div className="flex items-center space-x-2 p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        {/* Text Formatting */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('bold')
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Negrito"
        >
          <i className="ri-bold w-4 h-4 flex items-center justify-center"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('italic')
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Itálico"
        >
          <i className="ri-italic w-4 h-4 flex items-center justify-center"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('underline')
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Sublinhado"
        >
          <i className="ri-underline w-4 h-4 flex items-center justify-center"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('strike')
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Tachado"
        >
          <i className="ri-strikethrough w-4 h-4 flex items-center justify-center"></i>
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>

        {/* Headings */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Título 1"
        >
          <i className="ri-h-1 w-4 h-4 flex items-center justify-center"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Título 2"
        >
          <i className="ri-h-2 w-4 h-4 flex items-center justify-center"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Título 3"
        >
          <i className="ri-h-3 w-4 h-4 flex items-center justify-center"></i>
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>

        {/* Lists */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('bulletList')
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Lista não ordenada"
        >
          <i className="ri-list-unordered w-4 h-4 flex items-center justify-center"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('orderedList')
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Lista ordenada"
        >
          <i className="ri-list-ordered w-4 h-4 flex items-center justify-center"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('taskList')
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Lista de tarefas"
        >
          <i className="ri-checkbox-line w-4 h-4 flex items-center justify-center"></i>
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>

        {/* Text Alignment */}
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive({ textAlign: 'left' })
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Alinhar à esquerda"
        >
          <i className="ri-align-left w-4 h-4 flex items-center justify-center"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive({ textAlign: 'center' })
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Centralizar"
        >
          <i className="ri-align-center w-4 h-4 flex items-center justify-center"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive({ textAlign: 'right' })
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Alinhar à direita"
        >
          <i className="ri-align-right w-4 h-4 flex items-center justify-center"></i>
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>

        {/* Other formatting */}
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('code')
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Código inline"
        >
          <i className="ri-code-s-slash-line w-4 h-4 flex items-center justify-center"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-2 rounded transition-colors ${
            editor.isActive('codeBlock')
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Bloco de código"
        >
          <i className="ri-code-box-line w-4 h-4 flex items-center justify-center"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-400"
          title="Linha horizontal"
        >
          <i className="ri-separator w-4 h-4 flex items-center justify-center"></i>
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
        <button
          onClick={() => {
            const url = prompt('Digite a URL da imagem:');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-400"
          title="Inserir imagem"
        >
          <i className="ri-image-line w-4 h-4 flex items-center justify-center"></i>
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>

        {/* Advanced Text Formatting */}
        <button
          onClick={() => {
            const color = prompt('Digite a cor (ex: #ff0000, red, blue):');
            if (color && editor) {
              editor.chain().focus().setColor(color).run();
            }
          }}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-400"
          title="Cor do texto"
        >
          <i className="ri-palette-line w-4 h-4 flex items-center justify-center"></i>
        </button>
        <button
          onClick={() => {
            const font = prompt('Digite a fonte (ex: Arial, Times New Roman, Courier):');
            if (font && editor) {
              editor.chain().focus().setFontFamily(font).run();
            }
          }}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-400"
          title="Família da fonte"
        >
          <i className="ri-font-size w-4 h-4 flex items-center justify-center"></i>
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleSubscript().run()}
          className={`p-2 rounded transition-colors ${
            editor?.isActive('subscript')
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Subscrito"
        >
          <i className="ri-subscript w-4 h-4 flex items-center justify-center"></i>
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleSuperscript().run()}
          className={`p-2 rounded transition-colors ${
            editor?.isActive('superscript')
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Sobrescrito"
        >
          <i className="ri-superscript w-4 h-4 flex items-center justify-center"></i>
        </button>
        <button
          onClick={() => {
            const color = prompt('Digite a cor do destaque (ex: #ffff00, yellow, orange):');
            if (color && editor) {
              editor.chain().focus().toggleHighlight({ color }).run();
            }
          }}
          className={`p-2 rounded transition-colors ${
            editor?.isActive('highlight')
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
          }`}
          title="Destacar texto"
        >
          <i className="ri-mark-pen-line w-4 h-4 flex items-center justify-center"></i>
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>

        {/* Character Count */}
        <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
          <i className="ri-file-text-line w-4 h-4"></i>
          <span className="font-mono">
            {(editor?.storage.characterCount.characters() || 0).toLocaleString('pt-BR')}
          </span>
          <span className="text-gray-400 dark:text-gray-500">caracteres</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`${showSplitView ? 'w-1/2' : 'w-full'} flex flex-col overflow-hidden`}>
          {/* TipTap Editor */}
          <div className="flex-1 bg-white dark:bg-gray-800 overflow-y-auto">
            <EditorContent 
              editor={editor} 
              className="p-6 text-gray-800 dark:text-gray-200 focus:outline-none h-full prose prose-sm max-w-none dark:prose-invert"
            />
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags</h4>
              <button
                onClick={() => setShowTagInput(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium whitespace-nowrap"
              >
                Adicionar Tag
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center space-x-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                >
                  <span>{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-blue-600 dark:hover:text-blue-400"
                    title={`Remover tag "${tag}"`}
                  >
                    <i className="ri-close-line w-3 h-3 flex items-center justify-center"></i>
                  </button>
                </span>
              ))}
            </div>

            {showTagInput && (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Nome da tag"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                />
                <button
                  onClick={handleAddTag}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                >
                  Adicionar
                </button>
                <button
                  onClick={() => {
                    setShowTagInput(false);
                    setNewTag('');
                  }}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-2 py-2 whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        {showSplitView && (
          <div className="w-1/2 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Comparar com outra nota</h4>
            </div>
            <div className="flex-1 p-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 overflow-y-auto">
              {secondNote ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-gray-800 dark:text-gray-200">{secondNote.title}</h5>
                    <button
                      onClick={() => setSecondNote(null)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      title="Fechar comparação"
                    >
                      <i className="ri-close-line w-4 h-4"></i>
                    </button>
                  </div>
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: secondNote.content || '' }}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    Selecione outra nota para comparar com a nota atual
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {notes.map(note => (
                      note.id !== selectedNote?.id && (
                        <div
                          key={note.id}
                          onClick={() => setSecondNote(note)}
                          className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <h6 className="font-medium text-gray-800 dark:text-gray-200 text-sm mb-1">
                            {note.title}
                          </h6>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                            {(() => {
                              if (!note.content) return 'Sem conteúdo';
                              const tmp = document.createElement('div');
                              tmp.innerHTML = note.content;
                              return tmp.textContent || tmp.innerText || 'Sem conteúdo';
                            })()}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {new Date(note.updated_at || '').toLocaleDateString()}
                            </span>
                            {note.folder && (
                              <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full">
                                {note.folder}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Mudanças Não Salvas */}
      {showSaveModal && (
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
                onClick={handleSaveAndContinue}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Salvar e Continuar
              </button>
              <button
                onClick={handleDiscardChanges}
                className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Descartar Mudanças
              </button>
              <button
                onClick={handleCancelAction}
                className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-4 py-2 font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Saída Personalizado */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mr-3">
                <i className="ri-error-warning-line w-5 h-5 text-red-600 dark:text-red-400"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Sair da Página
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Você tem mudanças não salvas. O que você gostaria de fazer antes de sair?
            </p>
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleSaveAndExit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Salvar e Sair
              </button>
              <button
                onClick={handleDiscardAndExit}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Descartar e Sair
              </button>
              <button
                onClick={handleCancelExit}
                className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-4 py-2 font-medium transition-colors"
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