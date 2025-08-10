'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { kanbanHelpers, KanbanBoardWithData, KanbanCard } from '../lib/kanbanHelpers';
import { companyHelpers, type BoardPermissions, type AccessibleBoardMeta } from '../lib/companyHelpers';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './ToastProvider';
import { useI18n, useDateFormatter } from './I18nProvider';
import { authHelpers } from '../lib/supabase';
import ShareBoardModal from './ShareBoardModal';

export default function KanbanBoard() {
  const { t } = useI18n();
  const { formatDate } = useDateFormatter();
  const [boards, setBoards] = useState<AccessibleBoardMeta[]>([]);
  const [activeBoard, setActiveBoard] = useState<KanbanBoardWithData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const [showRenameBoardModal, setShowRenameBoardModal] = useState(false);
  const [renameBoardTitle, setRenameBoardTitle] = useState('');
  const [showNewColumnModal, setShowNewColumnModal] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [creatingCard, setCreatingCard] = useState(false);
  const [newCardColumn, setNewCardColumn] = useState('');
  const [draggedCard, setDraggedCard] = useState<KanbanCard | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [newCard, setNewCard] = useState({
    title: '',
    description: '',
    assignee: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
    tags: [] as string[]
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [_banner, setBanner] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteLoading, setConfirmDeleteLoading] = useState(false);
  const [confirmDeleteCardOpen, setConfirmDeleteCardOpen] = useState(false);
  const [confirmDeleteCardLoading, setConfirmDeleteCardLoading] = useState(false);
  const [pendingDeleteCard, setPendingDeleteCard] = useState<KanbanCard | null>(null);
  const [showEditCardModal, setShowEditCardModal] = useState(false);
  const [editCard, setEditCard] = useState<{ id: string; column_id: string; title: string; description: string; assignee: string; priority: 'low'|'medium'|'high'; dueDate: string } | null>(null);
  const toast = useToast();
  const realtimeRef = useRef<any>(null);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const { user } = await authHelpers.getCurrentUser();
        if (!user) return;

        setCurrentUser(user);

        // Load user's accessible boards (own + shared via companies)
        const { data: accessibleBoards } = await companyHelpers.getUserAccessibleBoards();
        const list = accessibleBoards || [];
        const seen = new Set<string>();
        const unique = list.filter(b => {
          if (seen.has(b.id)) return false;
          seen.add(b.id);
          return true;
        });
        setBoards(unique);

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
      const title = typeof window !== 'undefined' ? window.prompt(t('kanban.createBoard'), 'Meu Board') : 'Meu Board';
      if (!title) return;

      const { data: createdBoard, error } = await kanbanHelpers.createBoard(currentUser.id, title);
      if (error || !createdBoard) return;

      // Criar colunas padrão
      await Promise.all([
        kanbanHelpers.createColumn(createdBoard.id, 'To Do', 0),
        kanbanHelpers.createColumn(createdBoard.id, 'In Progress', 1),
        kanbanHelpers.createColumn(createdBoard.id, 'Done', 2)
      ]);

      // Carregar board completo e atualizar estado
      const { data: boardData } = await kanbanHelpers.getBoardWithData(createdBoard.id);
      setBoards(prev => [{
        id: createdBoard.id,
        title: createdBoard.title,
        created_at: createdBoard.created_at,
        updated_at: createdBoard.updated_at,
        is_shared: false,
        company_name: null,
        permissions: {
          view_board: true,
          manage_board: true,
          manage_columns: true,
          create_card: true,
          edit_card: true,
          move_card: true,
          delete_card: true,
          manage_members: true
        }
      }, ...prev.filter(b => b.id !== createdBoard.id)]);
      setActiveBoard(boardData);
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };
  
  const createDefaultBoardSilently = async () => {
    if (!currentUser) return null;
    const { data: createdBoard } = await kanbanHelpers.createBoard(currentUser.id, 'Meu Board');
    if (!createdBoard) return null;
    await Promise.all([
      kanbanHelpers.createColumn(createdBoard.id, 'To Do', 0),
      kanbanHelpers.createColumn(createdBoard.id, 'In Progress', 1),
      kanbanHelpers.createColumn(createdBoard.id, 'Done', 2)
    ]);
    const { data: boardData } = await kanbanHelpers.getBoardWithData(createdBoard.id);
    setBoards(prev => [{
      id: createdBoard.id,
      title: createdBoard.title,
      created_at: createdBoard.created_at,
      updated_at: createdBoard.updated_at,
      is_shared: false,
      company_name: null,
      permissions: {
        view_board: true,
        manage_board: true,
        manage_columns: true,
        create_card: true,
        edit_card: true,
        move_card: true,
        delete_card: true,
        manage_members: true
      }
    }, ...prev.filter(b => b.id !== createdBoard.id)]);
    setActiveBoard(boardData);
    return createdBoard;
  };

  const handleRenameBoard = async () => {
    try {
      if (!activeBoard) return;
      const meta = boards.find(b => b.id === activeBoard.id);
      const can = (perm: keyof BoardPermissions) => !!meta?.permissions?.[perm];
      if (!can('manage_board')) {
        toast.info(t('kanban.noPermissionCreateColumns'));
        return;
      }
      const title = renameBoardTitle.trim();
      if (!title || title === activeBoard.title) return;
      const { data, error } = await kanbanHelpers.updateBoard(activeBoard.id, title);
      if (error || !data) {
        toast.error(t('kanban.boardRenameError'));
        return;
      }
      setBoards(prev => prev.map(b => (b.id === data.id ? { ...b, title: data.title } : b)));
      setActiveBoard({ ...activeBoard, title: data.title });
      toast.success(t('kanban.boardRenamed'));
      setShowRenameBoardModal(false);
    } catch (error) {
      console.error('Error renaming board:', error);
      toast.error('Erro inesperado ao renomear o board.');
    }
  };

  const handleDeleteBoard = () => {
    if (!activeBoard) return;
    const meta = boards.find(b => b.id === activeBoard.id);
    const can = (perm: keyof BoardPermissions) => !!meta?.permissions?.[perm];
    if (!can('manage_board')) {
      toast.info(t('kanban.noPermissionCreateColumns'));
      return;
    }
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (!activeBoard) return;
      setConfirmDeleteLoading(true);
      const { error } = await kanbanHelpers.deleteBoard(activeBoard.id);
      if (error) {
        toast.error(t('kanban.boardDeleteError'));
        return;
      }
      const remaining = boards.filter(b => b.id !== activeBoard.id);
      setBoards(remaining);
      if (remaining.length > 0) {
        const nextId = remaining[0].id;
        const { data: boardData } = await kanbanHelpers.getBoardWithData(nextId);
        setActiveBoard(boardData);
      } else {
        await createDefaultBoardSilently();
      }
      toast.success(t('kanban.boardDeleted'));
    } catch (error) {
      console.error('Error deleting board:', error);
      toast.error('Erro inesperado ao excluir o board.');
    } finally {
      setConfirmDeleteLoading(false);
      setConfirmDeleteOpen(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, card: KanbanCard) => {
    const meta = boards.find(b => b.id === activeBoard?.id);
    const can = (perm: keyof BoardPermissions) => !!meta?.permissions?.[perm];
    if (!can('move_card')) return;
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumnId(columnId);
    // calcular índice alvo com base no mouse sobre os cards
    const container = columnRefs.current[columnId];
    if (!container) { setDragOverIndex(null); return; }
    const cards = Array.from(container.querySelectorAll('[data-card-id]')) as HTMLElement[];
    if (cards.length === 0) { setDragOverIndex(0); return; }
    const mouseY = e.clientY;
    let idx = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (mouseY < midY) { idx = i; break; }
    }
    setDragOverIndex(idx);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedCard || !activeBoard) return;
    const meta = boards.find(b => b.id === activeBoard.id);
    const can = (perm: keyof BoardPermissions) => !!meta?.permissions?.[perm];
    if (!can('move_card')) {
      toast.info(t('kanban.noPermissionCreateCards'));
      return;
    }

    try {
      const originColumnId = draggedCard.column_id;
      const originColumn = activeBoard.columns.find(c => c.id === originColumnId);
      const targetColumn = activeBoard.columns.find(c => c.id === targetColumnId);
      if (!originColumn || !targetColumn) return;

      const targetIndex = dragOverIndex !== null ? Math.max(0, Math.min(dragOverIndex, targetColumn.cards.length)) : targetColumn.cards.length;
      await kanbanHelpers.moveCard(draggedCard.id, targetColumnId, targetIndex);

      // Atualização otimista
      const newColumns = activeBoard.columns.map(c => ({ ...c, cards: [...c.cards] }));
      // remover do original
      const origin = newColumns.find(c => c.id === originColumnId)!;
      origin.cards = origin.cards.filter(c => c.id !== draggedCard.id).map((c, i) => ({ ...c, order_index: i }));
      // inserir no alvo
      const target = newColumns.find(c => c.id === targetColumnId)!;
      const movedCard = { ...draggedCard, column_id: targetColumnId, order_index: targetIndex } as KanbanCard;
      target.cards.splice(targetIndex, 0, movedCard);
      target.cards = target.cards.map((c, i) => ({ ...c, order_index: i }));

      const updatedBoard = { ...activeBoard, columns: newColumns };
      setActiveBoard(updatedBoard);

      // Persistir reordenação
      const originIds = origin.cards.map(c => c.id);
      const targetIds = target.cards.map(c => c.id);
      await Promise.all([
        kanbanHelpers.reorderCards(originColumnId, originIds),
        kanbanHelpers.reorderCards(targetColumnId, targetIds)
      ]);
    } catch (error) {
      console.error('Error moving card:', error);
      toast.error(t('kanban.moveCardError'));
    } finally {
      setDraggedCard(null);
      setDragOverColumnId(null);
      setDragOverIndex(null);
    }
  };

  const handleCreateCard = async () => {
    if (!newCard.title.trim() || !activeBoard) return;
    const meta = boards.find(b => b.id === activeBoard.id);
    const can = (perm: keyof BoardPermissions) => !!meta?.permissions?.[perm];
    if (!can('create_card')) {
      toast.info(t('kanban.noPermissionCreateCards'));
      return;
    }

    try {
      setCreatingCard(true);
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
        toast.error(t('kanban.cardCreateError'));
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
      setShowNewCardModal(false);
      setNewCard({
        title: '',
        description: '',
        assignee: '',
        priority: 'medium',
        dueDate: '',
        tags: []
      });
      toast.success(t('kanban.cardCreated'));
    } catch (error) {
      console.error('Error creating card:', error);
      toast.error('Erro inesperado ao criar card.');
    } finally {
      setCreatingCard(false);
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
      toast.error(t('kanban.loadBoardError'));
    }
  };

  // ESC para fechar modal de novo card (hook deve ser chamado sempre, sem retornar antes)
  useEffect(() => {
    if (!showNewCardModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowNewCardModal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showNewCardModal]);

  // Realtime: subscribe to changes for the active board
  useEffect(() => {
    if (!activeBoard || !currentUser) return;

    // Build cards filter from current columns
    const columnIds = activeBoard.columns.map(c => c.id);
    const cardsFilter = columnIds.length > 0 ? `column_id=in.(${columnIds.join(',')})` : '';

    // Clean previous channel
    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
      realtimeRef.current = null;
    }

    const channel = supabase.channel(`realtime:board:${activeBoard.id}`, {
      config: { presence: { key: currentUser.id } }
    });

    // Boards: update/delete
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'kanban_boards', filter: `id=eq.${activeBoard.id}`
    }, (payload: any) => {
      if (payload.eventType === 'UPDATE') {
        setBoards(prev => prev.map(b => (b.id === payload.new.id ? { ...b, title: payload.new.title } : b)));
        setActiveBoard(b => (b ? { ...b, title: payload.new.title } : b));
      } else if (payload.eventType === 'DELETE') {
        // If board deleted elsewhere, fallback to first available or create default
        setBoards(prev => prev.filter(b => b.id !== payload.old.id));
        setActiveBoard(null);
      }
    });

    // Columns: insert/update/delete for this board
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'kanban_columns', filter: `board_id=eq.${activeBoard.id}`
    }, (payload: any) => {
      setActiveBoard(prev => {
        if (!prev) return prev;
        if (payload.eventType === 'INSERT') {
          const exists = prev.columns.some(c => c.id === payload.new.id);
          if (exists) return prev;
          const cols = [...prev.columns, { ...payload.new, cards: [] }].sort((a, b) => a.order_index - b.order_index);
          return { ...prev, columns: cols };
        }
        if (payload.eventType === 'UPDATE') {
          const cols = prev.columns.map(c => c.id === payload.new.id ? { ...c, title: payload.new.title, order_index: payload.new.order_index } : c)
            .sort((a, b) => a.order_index - b.order_index);
          return { ...prev, columns: cols };
        }
        if (payload.eventType === 'DELETE') {
          const cols = prev.columns.filter(c => c.id !== payload.old.id);
          return { ...prev, columns: cols };
        }
        return prev;
      });
    });

    // Cards: insert/update/delete for columns of this board
    if (cardsFilter) {
      channel.on('postgres_changes', {
        event: '*', schema: 'public', table: 'kanban_cards', filter: cardsFilter
      }, (payload: any) => {
        setActiveBoard(prev => {
          if (!prev) return prev;
          const cols = prev.columns.map(c => ({ ...c, cards: [...c.cards] }));
          if (payload.eventType === 'INSERT') {
            const idx = cols.findIndex(c => c.id === payload.new.column_id);
            if (idx >= 0) {
              const list = cols[idx].cards;
              const insertAt = Math.min(payload.new.order_index ?? list.length, list.length);
              const exists = list.some((cd: any) => cd.id === payload.new.id);
              if (!exists) {
                list.splice(insertAt, 0, payload.new);
                cols[idx].cards = list.map((cd: any, i: number) => ({ ...cd, order_index: i }));
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            // moved or updated
            const oldColIdx = cols.findIndex(c => c.id === payload.old.column_id);
            const newColIdx = cols.findIndex(c => c.id === payload.new.column_id);
            if (oldColIdx >= 0) {
              cols[oldColIdx].cards = cols[oldColIdx].cards.filter((cd: any) => cd.id !== payload.new.id).map((cd: any, i: number) => ({ ...cd, order_index: i }));
            }
            if (newColIdx >= 0) {
              const list = cols[newColIdx].cards;
              const at = Math.min(payload.new.order_index ?? list.length, list.length);
              const exists = list.some((cd: any) => cd.id === payload.new.id);
              if (!exists) {
                list.splice(at, 0, payload.new);
              } else {
                cols[newColIdx].cards = list.map((cd: any) => cd.id === payload.new.id ? { ...cd, ...payload.new } : cd);
              }
              cols[newColIdx].cards = cols[newColIdx].cards.map((cd: any, i: number) => ({ ...cd, order_index: i }));
            }
          } else if (payload.eventType === 'DELETE') {
            const ci = cols.findIndex(c => c.id === payload.old.column_id);
            if (ci >= 0) {
              cols[ci].cards = cols[ci].cards.filter((cd: any) => cd.id !== payload.old.id).map((cd: any, i: number) => ({ ...cd, order_index: i }));
            }
          }
          return { ...prev, columns: cols };
        });
      });
    }

    channel.subscribe();
    realtimeRef.current = channel;

    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
  }, [activeBoard, currentUser]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-loader-4-line w-4 h-4 text-white animate-spin"></i>
          </div>
          <p className="text-gray-500 dark:text-gray-400">{t('kanban.loading')}</p>
        </div>
      </div>
    );
  }

  if (!activeBoard) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <i className="ri-kanban-view w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"></i>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">{t('kanban.noBoardTitle')}</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{t('kanban.noBoardSubtitle')}</p>
          <button
            onClick={handleCreateBoard}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {t('kanban.createBoard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('kanban.title')}</h1>
          <select
            value={activeBoard.id}
            onChange={(e) => handleBoardChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm pr-8"
            title={t('kanban.selectBoard')}
          >
            {boards.map(board => (
              <option key={board.id} value={board.id}>
                 {board.title} {board.is_shared && `(${t('kanban.sharedBy')} ${board.company_name})`}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCreateBoard}
            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 px-3 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 whitespace-nowrap"
            title={t('kanban.newBoard')}
          >
            <i className="ri-layout-grid-line w-4 h-4 flex items-center justify-center"></i>
          </button>
          <button
            onClick={() => {
              setRenameBoardTitle(activeBoard.title);
              setShowRenameBoardModal(true);
            }}
            disabled={!boards.find(b => b.id === activeBoard.id)?.permissions?.manage_board}
            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 px-3 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 whitespace-nowrap"
            title={t('kanban.renameBoard')}
          >
            <i className="ri-edit-line w-4 h-4 flex items-center justify-center"></i>
          </button>
          <button
            onClick={handleDeleteBoard}
            disabled={!boards.find(b => b.id === activeBoard.id)?.permissions?.manage_board}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 whitespace-nowrap"
            title={t('kanban.deleteBoard')}
          >
            <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center"></i>
          </button>
          <button
            onClick={() => {
              const meta = boards.find(b => b.id === activeBoard.id);
              if (!meta?.permissions?.manage_board) {
                setBanner({ type: 'info', text: 'Você não tem permissão para compartilhar este board.' });
                return;
              }
              setShowShareModal(true);
            }}
            disabled={!boards.find(b => b.id === activeBoard.id)?.permissions?.manage_board}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 whitespace-nowrap"
            title={t('kanban.shareBoard')}
          >
            <i className="ri-share-line w-4 h-4 flex items-center justify-center"></i>
            <span>{t('kanban.share')}</span>
          </button>
          <button
            onClick={() => {
              const meta = boards.find(b => b.id === activeBoard.id);
              const can = (perm: keyof BoardPermissions) => !!meta?.permissions?.[perm];
              if (!can('create_card')) {
                setBanner({ type: 'info', text: 'Você não tem permissão para criar cards.' });
                return;
              }
              const firstColumnId = activeBoard.columns[0]?.id;
              if (!firstColumnId) {
                setBanner({ type: 'info', text: 'Nenhuma coluna disponível para adicionar card.' });
                return;
              }
              setNewCardColumn(firstColumnId);
              setShowNewCardModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 whitespace-nowrap"
          >
            <i className="ri-add-line w-4 h-4 flex items-center justify-center"></i>
            <span>{t('kanban.addCard')}</span>
          </button>
          <button
            onClick={() => {
              const meta = boards.find(b => b.id === activeBoard.id);
              const can = (perm: keyof BoardPermissions) => !!meta?.permissions?.[perm];
              if (!can('manage_columns')) {
                setBanner({ type: 'info', text: 'Você não tem permissão para criar colunas.' });
                return;
              }
              setNewColumnTitle('');
              setShowNewColumnModal(true);
            }}
            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 px-3 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 whitespace-nowrap"
            title={t('kanban.newColumn')}
          >
            <i className="ri-column-density w-4 h-4 flex items-center justify-center"></i>
          </button>
        </div>
      </div>

      {/* toasts substituem o banner local */}

      <div className="flex-1 p-6 overflow-x-auto">
        <div className="flex space-x-6 h-full min-w-max">
          {activeBoard.columns.map(column => (
            <div
              key={column.id}
              className={`w-80 rounded-lg p-4 flex flex-col ${dragOverColumnId === column.id ? 'bg-gray-100 dark:bg-gray-600 border-2 border-blue-400' : 'bg-gray-50 dark:bg-gray-700'}`}
              onDragOver={(e) => handleDragOver(e, column.id)}
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
                      const meta = boards.find(b => b.id === activeBoard.id);
                      const can = (perm: keyof BoardPermissions) => !!meta?.permissions?.[perm];
                      if (!can('create_card')) {
                        setBanner({ type: 'info', text: 'Você não tem permissão para criar cards.' });
                        return;
                      }
                      setNewCardColumn(column.id);
                      setShowNewCardModal(true);
                    }}
                    disabled={!boards.find(b => b.id === activeBoard.id)?.permissions?.create_card}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    title={t('kanban.columnAddCard')}
                    aria-label={t('kanban.columnAddCard')}
                  >
                    <i className="ri-add-line w-4 h-4 flex items-center justify-center text-gray-500"></i>
                  </button>
                </div>
              </div>

              <div className="space-y-3 flex-1" ref={(el) => { columnRefs.current[column.id] = el; }}>
                {column.cards.map(card => (
                  <div
                    key={card.id}
                    draggable={!!boards.find(b => b.id === activeBoard.id)?.permissions?.move_card}
                    onDragStart={(e) => handleDragStart(e, card)}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 cursor-move hover:shadow-md transition-shadow"
                    data-card-id={card.id}
                    aria-label={`Card ${card.title}`}
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
                      <span className="truncate max-w-[140px]" title={card.assignee}>{card.assignee}</span>
                      {card.due_date && (
                        <span className="flex items-center space-x-1">
                          <i className="ri-calendar-line w-3 h-3 flex items-center justify-center"></i>
                          <span>{formatDate(card.due_date, { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-2 text-xs">
                      <button
                        onClick={() => {
                          setEditCard({
                            id: card.id,
                            column_id: card.column_id,
                            title: card.title,
                            description: card.description || '',
                            assignee: card.assignee || '',
                            priority: card.priority,
                            dueDate: card.due_date ? card.due_date.slice(0, 10) : ''
                          } as any);
                          setShowEditCardModal(true);
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        title="Editar card"
                        aria-label="Editar card"
                        disabled={!boards.find(b => b.id === activeBoard.id)?.permissions?.edit_card}
                      >
                        <i className="ri-edit-2-line w-4 h-4"></i>
                      </button>
                      <button
                        onClick={() => { setPendingDeleteCard(card); setConfirmDeleteCardOpen(true); }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                        title="Excluir card"
                        aria-label="Excluir card"
                        disabled={!boards.find(b => b.id === activeBoard.id)?.permissions?.delete_card}
                      >
                        <i className="ri-delete-bin-line w-4 h-4"></i>
                      </button>
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
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('kanban.createNewCard')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('kanban.field.title')}</label>
                <input
                  type="text"
                  value={newCard.title}
                  onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder={t('kanban.field.title')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('kanban.field.description')}</label>
                <textarea
                  value={newCard.description}
                  onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  rows={3}
                  placeholder={t('kanban.field.description')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('kanban.field.assignee')}</label>
                <input
                  type="text"
                  value={newCard.assignee}
                  onChange={(e) => setNewCard({ ...newCard, assignee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder={t('kanban.field.assignee')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('kanban.field.priority')}</label>
                <select
                  value={newCard.priority}
                  onChange={(e) => setNewCard({ ...newCard, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm pr-8"
                  title="Selecionar prioridade"
                >
                  <option value="low">{t('kanban.priority.low')}</option>
                  <option value="medium">{t('kanban.priority.medium')}</option>
                  <option value="high">{t('kanban.priority.high')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('kanban.field.dueDate')}</label>
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
                {t('kanban.cancel')}
              </button>
              <button
                onClick={handleCreateCard}
                disabled={creatingCard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors whitespace-nowrap"
              >
                {creatingCard ? t('kanban.creating') : t('kanban.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenameBoardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('kanban.renameBoardTitle')}</h3>
            <input
              type="text"
              value={renameBoardTitle}
              onChange={(e) => setRenameBoardTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              placeholder="Novo nome do board"
            />
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowRenameBoardModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">{t('kanban.cancel')}</button>
              <button onClick={handleRenameBoard} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">{t('editor.save')}</button>
            </div>
          </div>
        </div>
      )}

      {showNewColumnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('kanban.newColumnTitle')}</h3>
            <input
              type="text"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              placeholder="Título da coluna"
            />
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowNewColumnModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">Cancelar</button>
              <button onClick={async () => {
                if (!activeBoard) return;
                const meta = boards.find(b => b.id === activeBoard.id);
                const can = (perm: keyof BoardPermissions) => !!meta?.permissions?.[perm];
                if (!can('manage_columns')) { toast.info('Sem permissão'); return; }
                const title = newColumnTitle.trim();
                if (!title) return;
                try {
                  const order = activeBoard.columns.length;
                  const { data, error } = await kanbanHelpers.createColumn(activeBoard.id, title, order);
                  if (error || !data) { toast.error('Erro ao criar coluna'); return; }
                  const updated = { ...activeBoard, columns: [...activeBoard.columns, { ...data, cards: [] }] };
                  setActiveBoard(updated);
                  setShowNewColumnModal(false);
                } catch (e) { console.error(e); toast.error('Erro inesperado'); }
              }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">{t('kanban.createColumn')}</button>
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

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title={t('kanban.confirm.deleteBoard.title')}
        description={t('kanban.confirm.deleteBoard.desc')}
        confirmText={t('kanban.confirm.delete')}
        loading={confirmDeleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <ConfirmDialog
        isOpen={confirmDeleteCardOpen}
        title={t('kanban.confirm.deleteCard.title')}
        description={t('kanban.confirm.deleteCard.desc')}
        confirmText={t('kanban.confirm.delete')}
        loading={confirmDeleteCardLoading}
        onConfirm={async () => {
          try {
            if (!pendingDeleteCard) return;
            setConfirmDeleteCardLoading(true);
            const { error } = await kanbanHelpers.deleteCard(pendingDeleteCard.id);
            if (error) { toast.error('Erro ao excluir card'); return; }
            if (activeBoard) {
              const updated = {
                ...activeBoard,
                columns: activeBoard.columns.map(c => c.id === pendingDeleteCard.column_id ? { ...c, cards: c.cards.filter(cd => cd.id !== pendingDeleteCard.id) } : c)
              };
              setActiveBoard(updated);
            }
            toast.success('Card excluído.');
          } catch (e) {
            console.error(e);
            toast.error('Erro inesperado ao excluir card.');
          } finally {
            setConfirmDeleteCardLoading(false);
            setConfirmDeleteCardOpen(false);
            setPendingDeleteCard(null);
          }
        }}
        onCancel={() => { setConfirmDeleteCardOpen(false); setPendingDeleteCard(null); }}
      />

      {showEditCardModal && editCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Editar Card</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={editCard.title}
                  onChange={(e) => setEditCard({ ...(editCard as any), title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="Card title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={editCard.description}
                  onChange={(e) => setEditCard({ ...(editCard as any), description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  rows={3}
                  placeholder="Card description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignee</label>
                <input
                  type="text"
                  value={editCard.assignee}
                  onChange={(e) => setEditCard({ ...(editCard as any), assignee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="Assigned to"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select
                  value={editCard.priority}
                  onChange={(e) => setEditCard({ ...(editCard as any), priority: e.target.value as any })}
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
                  value={editCard.dueDate}
                  onChange={(e) => setEditCard({ ...(editCard as any), dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  title="Data de vencimento"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditCardModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!editCard || !activeBoard) return;
                  try {
                    const { data, error } = await kanbanHelpers.updateCard(editCard.id, {
                      title: editCard.title,
                      description: editCard.description,
                      assignee: editCard.assignee,
                      priority: editCard.priority,
                      due_date: editCard.dueDate
                    } as any);
                    if (error || !data) { toast.error('Erro ao salvar card'); return; }
                    const updated = {
                      ...activeBoard,
                      columns: activeBoard.columns.map(c => c.id === (editCard?.column_id || '') ? {
                        ...c,
                        cards: c.cards.map(cd => cd.id === editCard.id ? { ...cd, ...data } : cd)
                      } : c)
                    };
                    setActiveBoard(updated);
                    setShowEditCardModal(false);
                    toast.success('Card atualizado.');
                  } catch (e) {
                    console.error(e);
                    toast.error('Erro inesperado ao atualizar card.');
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}