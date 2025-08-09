import { supabase } from './supabase';

export interface KanbanCard {
  id: string;
  column_id: string;
  title: string;
  description?: string;
  assignee?: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  tags?: string[];
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface KanbanColumn {
  id: string;
  board_id: string;
  title: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface KanbanBoard {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface KanbanBoardWithData extends KanbanBoard {
  columns: (KanbanColumn & { cards: KanbanCard[] })[];
}

export const kanbanHelpers = {
  // Boards
  async getBoards(userId: string): Promise<{ data: KanbanBoard[] | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_boards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  async createBoard(userId: string, title: string): Promise<{ data: KanbanBoard | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_boards')
      .insert([{ user_id: userId, title }])
      .select()
      .single();

    return { data, error };
  },

  async updateBoard(boardId: string, title: string): Promise<{ data: KanbanBoard | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_boards')
      .update({ title })
      .eq('id', boardId)
      .select()
      .single();

    return { data, error };
  },

  async deleteBoard(boardId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('kanban_boards')
      .delete()
      .eq('id', boardId);

    return { error };
  },

  // Columns
  async getColumns(boardId: string): Promise<{ data: KanbanColumn[] | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_columns')
      .select('*')
      .eq('board_id', boardId)
      .order('order_index', { ascending: true });

    return { data, error };
  },

  async createColumn(boardId: string, title: string, orderIndex: number): Promise<{ data: KanbanColumn | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_columns')
      .insert([{ board_id: boardId, title, order_index: orderIndex }])
      .select()
      .single();

    return { data, error };
  },

  async updateColumn(columnId: string, title: string): Promise<{ data: KanbanColumn | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_columns')
      .update({ title })
      .eq('id', columnId)
      .select()
      .single();

    return { data, error };
  },

  async deleteColumn(columnId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('kanban_columns')
      .delete()
      .eq('id', columnId);

    return { error };
  },

  async reorderColumns(boardId: string, columnIds: string[]): Promise<{ error: any }> {
    const updates = columnIds.map((id, index) => ({
      id,
      order_index: index
    }));

    const { error } = await supabase
      .from('kanban_columns')
      .upsert(updates);

    return { error };
  },

  // Cards
  async getCards(columnId: string): Promise<{ data: KanbanCard[] | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_cards')
      .select('*')
      .eq('column_id', columnId)
      .order('order_index', { ascending: true });

    return { data, error };
  },

  async createCard(cardData: Omit<KanbanCard, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: KanbanCard | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_cards')
      .insert([cardData])
      .select()
      .single();

    return { data, error };
  },

  async updateCard(cardId: string, updates: Partial<KanbanCard>): Promise<{ data: KanbanCard | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_cards')
      .update(updates)
      .eq('id', cardId)
      .select()
      .single();

    return { data, error };
  },

  async deleteCard(cardId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('kanban_cards')
      .delete()
      .eq('id', cardId);

    return { error };
  },

  async moveCard(cardId: string, newColumnId: string, newOrderIndex: number): Promise<{ error: any }> {
    const { error } = await supabase
      .from('kanban_cards')
      .update({ column_id: newColumnId, order_index: newOrderIndex })
      .eq('id', cardId);

    return { error };
  },

  async reorderCards(columnId: string, cardIds: string[]): Promise<{ error: any }> {
    try {
      await Promise.all(
        cardIds.map((id, index) =>
          supabase
            .from('kanban_cards')
            .update({ order_index: index })
            .eq('id', id)
        )
      );
      return { error: null };
    } catch (error) {
      return { error } as any;
    }
  },

  // Get complete board with columns and cards
  async getBoardWithData(boardId: string): Promise<{ data: KanbanBoardWithData | null; error: any }> {
    // Get board
    const { data: board, error: boardError } = await supabase
      .from('kanban_boards')
      .select('*')
      .eq('id', boardId)
      .single();

    if (boardError) return { data: null, error: boardError };

    // Get columns
    const { data: columns, error: columnsError } = await supabase
      .from('kanban_columns')
      .select('*')
      .eq('board_id', boardId)
      .order('order_index', { ascending: true });

    if (columnsError) return { data: null, error: columnsError };

    // Get all cards in a single query and group by column
    const columnIds = (columns || []).map(c => c.id);
    const cardsByColumn: Record<string, KanbanCard[]> = {};
    if (columnIds.length > 0) {
      const { data: allCards, error: cardsError } = await supabase
        .from('kanban_cards')
        .select('*')
        .in('column_id', columnIds as any)
        .order('order_index', { ascending: true });
      if (cardsError) return { data: null, error: cardsError };
      for (const card of allCards || []) {
        const list = cardsByColumn[card.column_id] || [];
        list.push(card as any);
        cardsByColumn[card.column_id] = list;
      }
    }

    const columnsWithCards = (columns || []).map((column) => ({
      ...column,
      cards: cardsByColumn[column.id] || []
    }));

    const boardWithData: KanbanBoardWithData = {
      ...board,
      columns: columnsWithCards
    };

    return { data: boardWithData, error: null };
  }
}; 