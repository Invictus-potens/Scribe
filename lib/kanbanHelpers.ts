import { supabase } from './supabase';
import { authHelpers } from './supabase';

export interface KanbanCard {
  id: string;
  column_id: string;
  title: string;
  description?: string;
  assignee?: string;
  assignee_id?: string | null;
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
  wip_limit?: number | null;
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

export interface KanbanComment {
  id: string;
  card_id: string;
  user_id: string;
  content: string;
  mentions?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface KanbanChecklistItem {
  id: string;
  card_id: string;
  content: string;
  is_done: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface KanbanAttachment {
  id: string;
  card_id: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  storage_path: string;
  created_at: string;
}

export interface KanbanCardTemplate {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
  created_at: string;
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

  async updateColumnFields(columnId: string, updates: Partial<KanbanColumn>): Promise<{ data: KanbanColumn | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_columns')
      .update(updates as any)
      .eq('id', columnId)
      .select()
      .single();
    return { data, error };
  },

  async deleteColumn(columnId: string): Promise<{ error: any }> {
    try {
      // Get the column to be deleted to know its board_id and order_index
      const { data: columnToDelete, error: fetchError } = await supabase
        .from('kanban_columns')
        .select('board_id, order_index')
        .eq('id', columnId)
        .single();

      if (fetchError) return { error: fetchError };

      // Delete the column (this will cascade delete cards due to foreign key constraints)
      const { error: deleteError } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', columnId);

      if (deleteError) return { error: deleteError };

      // Reorder remaining columns to fill the gap
      const { data: remainingColumns, error: remainingError } = await supabase
        .from('kanban_columns')
        .select('id, order_index')
        .eq('board_id', columnToDelete.board_id)
        .gt('order_index', columnToDelete.order_index)
        .order('order_index', { ascending: true });

      if (remainingError) return { error: remainingError };

      // Update order_index for remaining columns
      if (remainingColumns && remainingColumns.length > 0) {
        const updates = remainingColumns.map((col, index) => ({
          id: col.id,
          order_index: columnToDelete.order_index + index
        }));

        const { error: reorderError } = await supabase
          .from('kanban_columns')
          .upsert(updates);

        if (reorderError) return { error: reorderError };
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
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

  // Bulk operations for column deletion
  async moveAllCardsToColumn(sourceColumnId: string, targetColumnId: string): Promise<{ error: any }> {
    try {
      // Get all cards from source column
      const { data: sourceCards, error: fetchError } = await supabase
        .from('kanban_cards')
        .select('id')
        .eq('column_id', sourceColumnId)
        .order('order_index', { ascending: true });

      if (fetchError) return { error: fetchError };

      // Get current card count in target column to determine starting index
      const { count: targetCount, error: countError } = await supabase
        .from('kanban_cards')
        .select('*', { count: 'exact', head: true })
        .eq('column_id', targetColumnId);

      if (countError) return { error: countError };

      // Move all cards to target column
      if (sourceCards && sourceCards.length > 0) {
        const startIndex = targetCount || 0;
        const updates = sourceCards.map((card, index) => ({
          id: card.id,
          column_id: targetColumnId,
          order_index: startIndex + index
        }));

        const { error: updateError } = await supabase
          .from('kanban_cards')
          .upsert(updates);

        if (updateError) return { error: updateError };
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async deleteAllCardsInColumn(columnId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('kanban_cards')
      .delete()
      .eq('column_id', columnId);

    return { error };
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
    const columnIds = (columns || []).map((c: KanbanColumn) => c.id);
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

    const columnsWithCards = (columns || []).map((column: KanbanColumn) => ({
      ...column,
      cards: cardsByColumn[column.id] || []
    }));

    const boardWithData: KanbanBoardWithData = {
      ...board,
      columns: columnsWithCards
    };

    return { data: boardWithData, error: null };
  },

  // Comments
  async getCardComments(cardId: string): Promise<{ data: KanbanComment[] | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_card_comments')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: true });
    return { data: (data as KanbanComment[]) || null, error };
  },

  async addCardComment(cardId: string, content: string, mentions?: string[]): Promise<{ data: KanbanComment | null; error: any }> {
    const { user } = await authHelpers.getCurrentUser();
    if (!user) return { data: null, error: { message: 'Not authenticated' } } as any;
    const payload: any = { card_id: cardId, user_id: user.id, content, mentions: mentions && mentions.length ? mentions : null };
    const { data, error } = await supabase
      .from('kanban_card_comments')
      .insert([payload])
      .select()
      .single();
    return { data: (data as KanbanComment) || null, error };
  },

  async updateCardComment(commentId: string, content: string): Promise<{ data: KanbanComment | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_card_comments')
      .update({ content })
      .eq('id', commentId)
      .select()
      .single();
    return { data: (data as KanbanComment) || null, error };
  },

  async deleteCardComment(commentId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('kanban_card_comments')
      .delete()
      .eq('id', commentId);
    return { error };
  },

  // Checklist
  async getChecklistItems(cardId: string): Promise<{ data: KanbanChecklistItem[] | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_card_checklist_items')
      .select('*')
      .eq('card_id', cardId)
      .order('order_index', { ascending: true });
    return { data: (data as KanbanChecklistItem[]) || null, error };
  },

  async addChecklistItem(cardId: string, content: string, orderIndex: number): Promise<{ data: KanbanChecklistItem | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_card_checklist_items')
      .insert([{ card_id: cardId, content, order_index: orderIndex }])
      .select()
      .single();
    return { data: (data as KanbanChecklistItem) || null, error };
  },

  async updateChecklistItem(id: string, updates: Partial<KanbanChecklistItem>): Promise<{ data: KanbanChecklistItem | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_card_checklist_items')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();
    return { data: (data as KanbanChecklistItem) || null, error };
  },

  async deleteChecklistItem(id: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('kanban_card_checklist_items')
      .delete()
      .eq('id', id);
    return { error };
  },

  async reorderChecklistItems(cardId: string, orderedIds: string[]): Promise<{ error: any }> {
    try {
      await Promise.all(orderedIds.map((id, index) =>
        supabase.from('kanban_card_checklist_items').update({ order_index: index }).eq('id', id)
      ));
      return { error: null } as any;
    } catch (e) {
      return { error: e } as any;
    }
  },

  // Attachments
  async listAttachments(cardId: string): Promise<{ data: KanbanAttachment[] | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_card_attachments')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: true });
    return { data: (data as KanbanAttachment[]) || null, error };
  },

  async uploadAttachment(cardId: string, file: File, bucket = 'kanban-attachments'): Promise<{ data: KanbanAttachment | null; error: any }> {
    const path = `${cardId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) return { data: null, error: upErr };
    const { data, error } = await supabase
      .from('kanban_card_attachments')
      .insert([{ card_id: cardId, file_name: file.name, file_size: file.size, mime_type: file.type, storage_path: path }])
      .select()
      .single();
    return { data: (data as KanbanAttachment) || null, error };
  },

  async getAttachmentUrl(storagePath: string, bucket = 'kanban-attachments'): Promise<string | null> {
    try {
      const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      return data.publicUrl || null;
    } catch {
      try {
        const { data } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 300);
        return data?.signedUrl || null;
      } catch {
        return null;
      }
    }
  },

  async deleteAttachment(id: string, bucket = 'kanban-attachments'): Promise<{ error: any }> {
    // fetch for path
    const { data: row } = await supabase
      .from('kanban_card_attachments')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (row?.storage_path) {
      await supabase.storage.from(bucket).remove([row.storage_path]);
    }
    const { error } = await supabase
      .from('kanban_card_attachments')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Card templates
  async getCardTemplates(): Promise<{ data: KanbanCardTemplate[] | null; error: any }> {
    const { data, error } = await supabase
      .from('kanban_card_templates')
      .select('*')
      .order('created_at', { ascending: false });
    return { data: (data as KanbanCardTemplate[]) || null, error };
  },

  async createCardTemplate(title: string, description: string, priority: 'low' | 'medium' | 'high', tags: string[]): Promise<{ data: KanbanCardTemplate | null; error: any }> {
    const { user } = await authHelpers.getCurrentUser();
    if (!user) return { data: null, error: { message: 'Not authenticated' } } as any;
    const { data, error } = await supabase
      .from('kanban_card_templates')
      .insert([{ user_id: user.id, title, description, priority, tags }])
      .select()
      .single();
    return { data: (data as KanbanCardTemplate) || null, error };
  },

  async deleteCardTemplate(id: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('kanban_card_templates')
      .delete()
      .eq('id', id);
    return { error };
  }
}; 