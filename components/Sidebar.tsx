
'use client';

import { useState, useEffect } from 'react';

interface SidebarProps {
  selectedFolder: string;
  setSelectedFolder: (folder: string) => void;
  activeView: string;
  selectedNote: any;
  setSelectedNote: (note: any) => void;
  searchTerm: string;
}

export default function Sidebar({ 
  selectedFolder, 
  setSelectedFolder, 
  activeView, 
  selectedNote, 
  setSelectedNote,
  searchTerm 
}: SidebarProps) {
  const [folders, setFolders] = useState([
    { id: 'personal', name: 'Personal', color: 'bg-blue-500', count: 8 },
    { id: 'work', name: 'Work', color: 'bg-green-500', count: 12 },
    { id: 'projects', name: 'Projects', color: 'bg-purple-500', count: 5 },
    { id: 'ideas', name: 'Ideas', color: 'bg-orange-500', count: 15 }
  ]);

  const [notes, setNotes] = useState([
    {
      id: 1,
      title: 'Meeting Notes - Q4 Planning',
      content: 'Discussion about upcoming quarterly goals and objectives...',
      folder: 'work',
      tags: ['meeting', 'planning', 'Q4'],
      pinned: true,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: 2,
      title: 'Project Architecture Ideas',
      content: 'Initial thoughts on the new system architecture...',
      folder: 'projects',
      tags: ['architecture', 'technical', 'design'],
      pinned: false,
      createdAt: new Date('2024-01-14'),
      updatedAt: new Date('2024-01-14')
    },
    {
      id: 3,
      title: 'Book Reading List',
      content: 'Books to read this month including technical and fiction...',
      folder: 'personal',
      tags: ['books', 'reading', 'learning'],
      pinned: true,
      createdAt: new Date('2024-01-13'),
      updatedAt: new Date('2024-01-13')
    },
    {
      id: 4,
      title: 'Mobile App Feature Ideas',
      content: 'Creative features for the new mobile application...',
      folder: 'ideas',
      tags: ['mobile', 'features', 'innovation'],
      pinned: false,
      createdAt: new Date('2024-01-12'),
      updatedAt: new Date('2024-01-12')
    },
    {
      id: 5,
      title: 'Team Retrospective Notes',
      content: 'Key takeaways from the team retrospective meeting...',
      folder: 'work',
      tags: ['retrospective', 'team', 'feedback'],
      pinned: false,
      createdAt: new Date('2024-01-11'),
      updatedAt: new Date('2024-01-11')
    }
  ]);

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const filteredNotes = notes.filter(note => {
    const matchesFolder = selectedFolder === 'all' || note.folder === selectedFolder;
    const matchesSearch = !searchTerm || 
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFolder && matchesSearch;
  }).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const handleNewFolder = () => {
    if (newFolderName.trim()) {
      const newFolder = {
        id: newFolderName.toLowerCase().replace(/\s+/g, '-'),
        name: newFolderName,
        color: `bg-${['red', 'blue', 'green', 'yellow', 'purple', 'pink'][Math.floor(Math.random() * 6)]}-500`,
        count: 0
      };
      setFolders([...folders, newFolder]);
      setNewFolderName('');
      setShowNewFolderModal(false);
    }
  };

  const handleNewNote = () => {
    const newNote = {
      id: Date.now(),
      title: 'Untitled Note',
      content: '',
      folder: selectedFolder === 'all' ? 'personal' : selectedFolder,
      tags: [],
      pinned: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
  };

  if (activeView !== 'notes') {
    return null;
  }

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleNewNote}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 whitespace-nowrap"
        >
          <i className="ri-add-line w-4 h-4 flex items-center justify-center"></i>
          <span>New Note</span>
        </button>
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Folders</h3>
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <i className="ri-add-line w-4 h-4 flex items-center justify-center text-gray-500"></i>
          </button>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => setSelectedFolder('all')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors whitespace-nowrap ${
              selectedFolder === 'all' 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <i className="ri-folder-line w-4 h-4 flex items-center justify-center"></i>
            <span className="flex-1">All Notes</span>
            <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full">
              {notes.length}
            </span>
          </button>

          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolder(folder.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors whitespace-nowrap ${
                selectedFolder === folder.id 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${folder.color}`}></div>
              <span className="flex-1">{folder.name}</span>
              <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full">
                {notes.filter(note => note.folder === folder.id).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          {selectedFolder === 'all' ? 'All Notes' : folders.find(f => f.id === selectedFolder)?.name || 'Notes'}
        </h3>

        <div className="space-y-2">
          {filteredNotes.map(note => (
            <div
              key={note.id}
              onClick={() => setSelectedNote(note)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedNote?.id === note.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm line-clamp-1">
                  {note.title}
                </h4>
                {note.pinned && (
                  <i className="ri-pushpin-fill w-3 h-3 flex items-center justify-center text-blue-500 ml-2"></i>
                )}
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                {note.content || 'No content yet...'}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {note.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                  {note.tags.length > 2 && (
                    <span className="text-xs text-gray-500">+{note.tags.length - 2}</span>
                  )}
                </div>

                <span className="text-xs text-gray-500">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleNewFolder()}
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleNewFolder}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
