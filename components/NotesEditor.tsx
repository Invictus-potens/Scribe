
'use client';

import { useState, useEffect, useRef } from 'react';
import { notesHelpers, Note } from '../lib/supabase';
import { authHelpers } from '../lib/supabase';

interface NotesEditorProps {
  selectedFolder: string;
  selectedNote: any;
  setSelectedNote: (note: any) => void;
  searchTerm: string;
  onNoteSaved?: () => void;
  notes?: any[];
}

export default function NotesEditor({ 
  selectedFolder, 
  selectedNote, 
  setSelectedNote, 
  searchTerm,
  onNoteSaved,
  notes = []
}: NotesEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [showSplitView, setShowSplitView] = useState(false);
  const [secondNote, setSecondNote] = useState<any>(null);
  const [showTagInput, setShowTagInput] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title || '');
      setContent(selectedNote.content || '');
      setTags(selectedNote.tags || []);
      setIsPinned(selectedNote.is_pinned || false);
    }
  }, [selectedNote]);

  const handleSave = async () => {
    if (!selectedNote) return;

    try {
      const { user } = await authHelpers.getCurrentUser();
      if (!user) {
        console.error('User not authenticated');
        return;
      }

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
        // Notify parent component that note was saved
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
        // Notify parent component that note was saved
        if (onNoteSaved) {
          onNoteSaved();
        }
      }
    } catch (error) {
      console.error('Error saving note:', error);
      alert('An unexpected error occurred while saving the note');
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setNewTag('');
      setShowTagInput(false);
      // Save the note with updated tags
      setTimeout(() => handleSave(), 100);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    // Save the note with updated tags
    setTimeout(() => handleSave(), 100);
  };

  const formatText = (command: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, undefined);
      setIsFormatting(true);
      setTimeout(() => setIsFormatting(false), 200);
    }
  };

  const insertList = (type: 'ul' | 'ol') => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(`insert${type === 'ul' ? 'UnorderedList' : 'OrderedList'}`, false, undefined);
    }
  };

  if (!selectedNote) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-file-text-line w-16 h-16 flex items-center justify-center text-gray-300 dark:text-gray-600 mx-auto mb-4"></i>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No Note Selected</h3>
          <p className="text-gray-500 dark:text-gray-400">Select a note from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            className="text-xl font-semibold bg-transparent border-none focus:outline-none text-gray-800 dark:text-gray-200 flex-1"
            placeholder="Note title..."
          />
          <button
            onClick={async () => {
              const newPinnedState = !isPinned;
              setIsPinned(newPinnedState);
              // Update the note immediately
              if (selectedNote && selectedNote.id) {
                try {
                  const { user } = await authHelpers.getCurrentUser();
                  if (!user) return;
                  
                  const { data, error } = await notesHelpers.updateNote(selectedNote.id, {
                    ...selectedNote,
                    is_pinned: newPinnedState
                  });
                  if (error) {
                    console.error('Error updating pin status:', error);
                    setIsPinned(!newPinnedState); // Revert on error
                  } else {
                    setSelectedNote(data);
                    if (onNoteSaved) {
                      onNoteSaved();
                    }
                  }
                } catch (error) {
                  console.error('Error updating pin status:', error);
                  setIsPinned(!newPinnedState); // Revert on error
                }
              }
            }}
            className={`p-2 rounded-lg transition-colors ${
              isPinned 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <i className={`ri-pushpin-${isPinned ? 'fill' : 'line'} w-4 h-4 flex items-center justify-center`}></i>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSplitView(!showSplitView)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <i className="ri-layout-column-line w-4 h-4 flex items-center justify-center text-gray-600 dark:text-gray-400"></i>
          </button>
          {selectedNote && selectedNote.id && (
            <button
              onClick={async () => {
                if (confirm('Tem certeza que deseja deletar esta nota?')) {
                  try {
                    const { error } = await notesHelpers.deleteNote(selectedNote.id);
                    if (error) {
                      console.error('Error deleting note:', error);
                      alert(`Error deleting note: ${error.message}`);
                    } else {
                      setSelectedNote(null);
                      if (onNoteSaved) {
                        onNoteSaved();
                      }
                    }
                  } catch (error) {
                    console.error('Error deleting note:', error);
                    alert('An unexpected error occurred while deleting the note');
                  }
                }
              }}
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900 transition-colors text-red-600 dark:text-red-400"
              title="Delete Note"
            >
              <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center"></i>
            </button>
          )}
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            Save
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2 p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <button
          onClick={() => formatText('bold')}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <i className="ri-bold w-4 h-4 flex items-center justify-center text-gray-600 dark:text-gray-400"></i>
        </button>
        <button
          onClick={() => formatText('italic')}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <i className="ri-italic w-4 h-4 flex items-center justify-center text-gray-600 dark:text-gray-400"></i>
        </button>
        <button
          onClick={() => formatText('underline')}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <i className="ri-underline w-4 h-4 flex items-center justify-center text-gray-600 dark:text-gray-400"></i>
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
        <button
          onClick={() => insertList('ul')}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <i className="ri-list-unordered w-4 h-4 flex items-center justify-center text-gray-600 dark:text-gray-400"></i>
        </button>
        <button
          onClick={() => insertList('ol')}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <i className="ri-list-ordered w-4 h-4 flex items-center justify-center text-gray-600 dark:text-gray-400"></i>
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
        <button
          onClick={() => formatText('insertHorizontalRule')}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <i className="ri-separator w-4 h-4 flex items-center justify-center text-gray-600 dark:text-gray-400"></i>
        </button>
      </div>

      <div className="flex-1 flex">
        <div className={`${showSplitView ? 'w-1/2' : 'w-full'} flex flex-col`}>
          <div
            ref={editorRef}
            contentEditable
            className="flex-1 p-6 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none overflow-y-auto"
            style={{ minHeight: '400px' }}
            onBlur={() => {
              setContent(editorRef.current?.innerHTML || '');
              handleSave();
            }}
            onInput={() => {
              setContent(editorRef.current?.innerHTML || '');
            }}
            suppressContentEditableWarning={true}
          />

          <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags</h4>
              <button
                onClick={() => setShowTagInput(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium whitespace-nowrap"
              >
                Add Tag
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
                  placeholder="Tag name"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                />
                <button
                  onClick={handleAddTag}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowTagInput(false);
                    setNewTag('');
                  }}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-2 py-2 whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {showSplitView && (
          <div className="w-1/2 border-l border-gray-200 dark:border-gray-700">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Compare with another note</h4>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 h-full overflow-y-auto">
              {secondNote ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-gray-800 dark:text-gray-200">{secondNote.title}</h5>
                    <button
                      onClick={() => setSecondNote(null)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <i className="ri-close-line w-4 h-4"></i>
                    </button>
                  </div>
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: secondNote.content || '' }}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    Select another note to compare with the current note
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
                            {note.content || 'No content'}
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
    </div>
  );
}
