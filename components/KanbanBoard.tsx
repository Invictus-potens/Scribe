
'use client';

import { useState, useEffect } from 'react';

interface Card {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  tags: string[];
}

interface Column {
  id: string;
  title: string;
  cards: Card[];
}

interface Board {
  id: string;
  title: string;
  columns: Column[];
}

export default function KanbanBoard() {
  const [boards, setBoards] = useState<Board[]>([
    {
      id: 'project-alpha',
      title: 'Project Alpha',
      columns: [
        {
          id: 'todo',
          title: 'To Do',
          cards: [
            {
              id: 'kb-1',
              title: 'Design System Setup',
              description: 'Create a comprehensive design system for the project',
              assignee: 'John Doe',
              priority: 'high',
              dueDate: '2024-02-15',
              tags: ['design', 'system']
            },
            {
              id: 'kb-2',
              title: 'User Authentication',
              description: 'Implement secure user authentication system',
              assignee: 'Sarah Wilson',
              priority: 'high',
              dueDate: '2024-02-20',
              tags: ['auth', 'security']
            }
          ]
        },
        {
          id: 'progress',
          title: 'In Progress',
          cards: [
            {
              id: 'kb-3',
              title: 'API Development',
              description: 'Build RESTful API endpoints for the application',
              assignee: 'Mike Johnson',
              priority: 'medium',
              dueDate: '2024-02-25',
              tags: ['api', 'backend']
            }
          ]
        },
        {
          id: 'review',
          title: 'Review',
          cards: [
            {
              id: 'kb-4',
              title: 'Database Schema',
              description: 'Design and optimize database schema',
              assignee: 'Emily Davis',
              priority: 'medium',
              tags: ['database', 'schema']
            }
          ]
        },
        {
          id: 'done',
          title: 'Done',
          cards: [
            {
              id: 'kb-5',
              title: 'Project Setup',
              description: 'Initialize project structure and dependencies',
              assignee: 'John Doe',
              priority: 'low',
              tags: ['setup', 'initial']
            }
          ]
        }
      ]
    },
    {
      id: 'marketing',
      title: 'Marketing Campaign',
      columns: [
        {
          id: 'todo',
          title: 'To Do',
          cards: [
            {
              id: 'kb-6',
              title: 'Social Media Strategy',
              description: 'Develop comprehensive social media marketing strategy',
              assignee: 'Lisa Chen',
              priority: 'high',
              dueDate: '2024-02-18',
              tags: ['social', 'strategy']
            }
          ]
        },
        {
          id: 'progress',
          title: 'In Progress',
          cards: []
        },
        {
          id: 'review',
          title: 'Review',
          cards: []
        },
        {
          id: 'done',
          title: 'Done',
          cards: []
        }
      ]
    }
  ]);

  const [activeBoard, setActiveBoard] = useState(boards[0]);
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const [newCardColumn, setNewCardColumn] = useState('');
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [newCard, setNewCard] = useState({
    title: '',
    description: '',
    assignee: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
    tags: [] as string[]
  });

  const handleDragStart = (e: React.DragEvent, card: Card) => {
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedCard) return;

    const updatedColumns = activeBoard.columns.map(column => {
      if (column.id === targetColumnId) {
        return {
          ...column,
          cards: [...column.cards, draggedCard]
        };
      }
      return {
        ...column,
        cards: column.cards.filter(card => card.id !== draggedCard.id)
      };
    });

    const updatedBoard = { ...activeBoard, columns: updatedColumns };
    setActiveBoard(updatedBoard);
    setBoards(boards.map(board => board.id === activeBoard.id ? updatedBoard : board));
    setDraggedCard(null);
  };

  const handleCreateCard = () => {
    if (!newCard.title.trim()) return;

    const card: Card = {
      id: `kb-${Date.now()}`,
      title: newCard.title,
      description: newCard.description,
      assignee: newCard.assignee,
      priority: newCard.priority,
      dueDate: newCard.dueDate,
      tags: newCard.tags
    };

    const updatedColumns = activeBoard.columns.map(column => {
      if (column.id === newCardColumn) {
        return {
          ...column,
          cards: [...column.cards, card]
        };
      }
      return column;
    });

    const updatedBoard = { ...activeBoard, columns: updatedColumns };
    setActiveBoard(updatedBoard);
    setBoards(boards.map(board => board.id === activeBoard.id ? updatedBoard : board));
    setShowNewCardModal(false);
    setNewCard({
      title: '',
      description: '',
      assignee: '',
      priority: 'medium',
      dueDate: '',
      tags: []
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Kanban Board</h1>
          <select
            value={activeBoard.id}
            onChange={(e) => setActiveBoard(boards.find(b => b.id === e.target.value) || boards[0])}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm pr-8"
          >
            {boards.map(board => (
              <option key={board.id} value={board.id}>{board.title}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setNewCardColumn('todo');
            setShowNewCardModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 whitespace-nowrap"
        >
          <i className="ri-add-line w-4 h-4 flex items-center justify-center"></i>
          <span>Add Card</span>
        </button>
      </div>

      <div className="flex-1 p-6 overflow-x-auto">
        <div className="flex space-x-6 h-full min-w-max">
          {activeBoard.columns.map(column => (
            <div
              key={column.id}
              className="w-80 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex flex-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">{column.title}</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full">
                    {column.cards.length}
                  </span>
                  <button
                    onClick={() => {
                      setNewCardColumn(column.id);
                      setShowNewCardModal(true);
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  >
                    <i className="ri-add-line w-4 h-4 flex items-center justify-center text-gray-500"></i>
                  </button>
                </div>
              </div>

              <div className="space-y-3 flex-1">
                {column.cards.map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card)}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 cursor-move hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 text-sm">{card.title}</h4>
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(card.priority)}`}></div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{card.description}</p>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {card.tags.map(tag => (
                        <span key={tag} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{card.assignee}</span>
                      {card.dueDate && (
                        <span className="flex items-center space-x-1">
                          <i className="ri-calendar-line w-3 h-3 flex items-center justify-center"></i>
                          <span>{new Date(card.dueDate).toLocaleDateString()}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNewCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Create New Card</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={newCard.title}
                  onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="Card title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={newCard.description}
                  onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  rows={3}
                  placeholder="Card description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignee</label>
                <input
                  type="text"
                  value={newCard.assignee}
                  onChange={(e) => setNewCard({ ...newCard, assignee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="Assigned to"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select
                  value={newCard.priority}
                  onChange={(e) => setNewCard({ ...newCard, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm pr-8"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newCard.dueDate}
                  onChange={(e) => setNewCard({ ...newCard, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewCardModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                Create Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
