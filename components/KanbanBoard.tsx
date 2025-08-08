'use client';

import { useState, useEffect } from 'react';
import { kanbanHelpers, KanbanBoardWithData, KanbanCard } from '../lib/kanbanHelpers';
import { companyHelpers } from '../lib/companyHelpers';
import { authHelpers } from '../lib/supabase';
import ShareBoardModal from './ShareBoardModal';

export default function KanbanBoard() {
  const [boards, setBoards] = useState<any[]>([]);
  const [activeBoard, setActiveBoard] = useState<KanbanBoardWithData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const [newCardColumn, setNewCardColumn] = useState('');
  const [draggedCard, setDraggedCard] = useState<KanbanCard | null>(null);
  const [newCard, setNewCard] = useState({
    title: '',
    description: '',
    assignee: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
    tags: [] as string[]
  });
  const [showShareModal, setShowShareModal] = useState(false);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (!user) return;

        setCurrentUser(user);

        // Load user's accessible boards (own + shared via companies)
        const { data: accessibleBoards } = await companyHelpers.getUserAccessibleBoards(user.id);
        setBoards(accessibleBoards || []);

        // Set first board as active if available
        if (accessibleBoards && accessibleBoards.length > 0) {
          const { data: boardData } = await kanbanHelpers.getBoardWithData(accessibleBoards[0].id);
          setActiveBoard(boardData);
        }
      } catch (error) {
        console.error('Error loading kanban data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCreateBoard = async () => {
    try {
      if (!currentUser) return;
      const title = typeof window !== 'undefined' ? window.prompt('Nome do board', 'Meu Board') : 'Meu Board';
      if (!title) return;

      const { data: createdBoard, error } = await kanbanHelpers.createBoard(currentUser.id, title);
      if (error || !createdBoard) return;

      // Criar colunas padrão
      await kanbanHelpers.createColumn(createdBoard.id, 'To Do', 0);
      await kanbanHelpers.createColumn(createdBoard.id, 'In Progress', 1);
      await kanbanHelpers.createColumn(createdBoard.id, 'Done', 2);

      // Carregar board completo e atualizar estado
      const { data: boardData } = await kanbanHelpers.getBoardWithData(createdBoard.id);
      setBoards(prev => [{ ...createdBoard, is_shared: false, company_name: null }, ...prev]);
      setActiveBoard(boardData);
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };
  
  const createDefaultBoardSilently = async () => {
    if (!currentUser) return null;
    const { data: createdBoard } = await kanbanHelpers.createBoard(currentUser.id, 'Meu Board');
    if (!createdBoard) return null;
    await kanbanHelpers.createColumn(createdBoard.id, 'To Do', 0);
    await kanbanHelpers.createColumn(createdBoard.id, 'In Progress', 1);
    await kanbanHelpers.createColumn(createdBoard.id, 'Done', 2);
    const { data: boardData } = await kanbanHelpers.getBoardWithData(createdBoard.id);
    setBoards(prev => [{ ...createdBoard, is_shared: false, company_name: null }, ...prev]);
    setActiveBoard(boardData);
    return createdBoard;
  };

  const handleRenameBoard = async () => {
    try {
      if (!activeBoard) return;
      const meta = boards.find(b => b.id === activeBoard.id);
      if (meta?.is_shared) {
        alert('Não é possível renomear um board compartilhado.');
        return;
      }
      const newTitle = typeof window !== 'undefined' ? window.prompt('Novo nome do board', activeBoard.title) : activeBoard.title;
      if (!newTitle || newTitle.trim() === '' || newTitle === activeBoard.title) return;
      const { data, error } = await kanbanHelpers.updateBoard(activeBoard.id, newTitle.trim());
      if (error || !data) return;
      setBoards(prev => prev.map(b => (b.id === data.id ? { ...b, title: data.title } : b)));
      setActiveBoard({ ...activeBoard, title: data.title });
    } catch (error) {
      console.error('Error renaming board:', error);
    }
  };

  const handleDeleteBoard = async () => {
    try {
      if (!activeBoard) return;
      const meta = boards.find(b => b.id === activeBoard.id);
      if (meta?.is_shared) {
        alert('Não é possível excluir um board compartilhado.');
        return;
      }
      const confirmed = typeof window !== 'undefined' ? window.confirm('Excluir este board? Esta ação não pode ser desfeita.') : false;
      if (!confirmed) return;
      const { error } = await kanbanHelpers.deleteBoard(activeBoard.id);
      if (error) return;
      const remaining = boards.filter(b => b.id !== activeBoard.id);
      setBoards(remaining);
      if (remaining.length > 0) {
        const nextId = remaining[0].id;
        const { data: boardData } = await kanbanHelpers.getBoardWithData(nextId);
        setActiveBoard(boardData);
      } else {
        await createDefaultBoardSilently();
      }
    } catch (error) {
      console.error('Error deleting board:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, card: KanbanCard) => {
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedCard || !activeBoard) return;

    try {
      // Update in database
      await kanbanHelpers.moveCard(draggedCard.id, targetColumnId, 0);

      // Update local state
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
    } catch (error) {
      console.error('Error moving card:', error);
    } finally {
      setDraggedCard(null);
    }
  };

  const handleCreateCard = async () => {
    if (!newCard.title.trim() || !activeBoard) return;

    try {
      // Find the target column
      const targetColumn = activeBoard.columns.find(col => col.id === newCardColumn);
      if (!targetColumn) return;

      // Create card in database
      const { data: card, error } = await kanbanHelpers.createCard({
        column_id: newCardColumn,
        title: newCard.title,
        description: newCard.description,
        assignee: newCard.assignee,
        priority: newCard.priority,
        due_date: newCard.dueDate,
        tags: newCard.tags,
        order_index: targetColumn.cards.length
      });

      if (error) {
        console.error('Error creating card:', error);
        return;
      }

      // Verificar se card não é null antes de adicionar
      if (!card) return;

      // Update local state
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
    } catch (error) {
      console.error('Error creating card:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleBoardChange = async (boardId: string) => {
    try {
      const { data: boardData } = await kanbanHelpers.getBoardWithData(boardId);
      setActiveBoard(boardData);
    } catch (error) {
      console.error('Error loading board:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-loader-4-line w-4 h-4 text-white animate-spin"></i>
          </div>
          <p className="text-gray-500 dark:text-gray-400">Carregando Kanban...</p>
        </div>
      </div>
    );
  }

  if (!activeBoard) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <i className="ri-kanban-view w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"></i>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Nenhum Board Disponível</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Crie um novo board para começar</p>
          <button
            onClick={handleCreateBoard}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Criar Board
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Kanban Board</h1>
          <select
            value={activeBoard.id}
            onChange={(e) => handleBoardChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm pr-8"
            title="Selecionar board"
          >
            {boards.map(board => (
              <option key={board.id} value={board.id}>
                {board.title} {board.is_shared && `(Compartilhado por ${board.company_name})`}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCreateBoard}
            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 px-3 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 whitespace-nowrap"
            title="Novo board"
          >
            <i className="ri-layout-grid-line w-4 h-4 flex items-center justify-center"></i>
          </button>
          <button
            onClick={handleRenameBoard}
            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 px-3 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 whitespace-nowrap"
            title="Renomear board"
          >
            <i className="ri-edit-line w-4 h-4 flex items-center justify-center"></i>
          </button>
          <button
            onClick={handleDeleteBoard}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 whitespace-nowrap"
            title="Excluir board"
          >
            <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center"></i>
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 whitespace-nowrap"
            title="Compartilhar board"
          >
            <i className="ri-share-line w-4 h-4 flex items-center justify-center"></i>
            <span>Compartilhar</span>
          </button>
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
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">{column.title}</h3>
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
                    title="Adicionar card"
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
                      {card.tags && card.tags.map(tag => (
                        <span key={tag} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{card.assignee}</span>
                      {card.due_date && (
                        <span className="flex items-center space-x-1">
                          <i className="ri-calendar-line w-3 h-3 flex items-center justify-center"></i>
                          <span>{new Date(card.due_date).toLocaleDateString()}</span>
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
                  title="Selecionar prioridade"
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
                  title="Data de vencimento"
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
      
      {/* Share Board Modal */}
      <ShareBoardModal
        boardId={activeBoard.id}
        boardTitle={activeBoard.title}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}