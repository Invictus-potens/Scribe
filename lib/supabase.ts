import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface User {
  id: string
  email: string
  full_name?: string
  created_at?: string
}

export interface Folder {
  id: string
  name: string
  user_id?: string
  created_at?: string
}

export interface Tag {
  id: string
  name: string
  user_id?: string
  color?: string
  created_at?: string
}

export interface CalendarEvent {
  id: string
  user_id: string
  title: string
  description?: string
  start_date: string
  end_date?: string
  all_day?: boolean
  color?: string
  reminder_minutes?: number
  reminder_set?: boolean
  created_at?: string
  updated_at?: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  folder?: string
  tags?: string[]
  is_pinned?: boolean
  is_private?: boolean
  created_at?: string
  updated_at?: string
}

export interface KanbanBoard {
  id: string
  user_id: string
  title: string
  created_at?: string
  updated_at?: string
}

export interface KanbanColumn {
  id: string
  board_id: string
  title: string
  order_index: number
  created_at?: string
  updated_at?: string
}

export interface KanbanCard {
  id: string
  column_id: string
  title: string
  description?: string
  assignee?: string
  priority: 'low' | 'medium' | 'high'
  due_date?: string
  tags?: string[]
  order_index: number
  created_at?: string
  updated_at?: string
}

// Database helper functions
export const authHelpers = {
  async signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    return { data, error }
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // New function to ensure user profile exists
  async ensureUserProfile(userId: string, email: string, fullName?: string) {
    try {
      // Use the database function to ensure user profile exists
      const { data, error } = await supabase
        .rpc('ensure_user_profile', {
          user_id: userId,
          user_email: email,
          user_full_name: fullName || null
        });

      if (error) {
        console.error('Error ensuring user profile:', error);
        return { error };
      }

      // If the database function returns false, it means there was an issue
      if (data === false) {
        return { error: { message: 'Failed to create user profile' } };
      }

      // Get the user profile to return
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return { error: profileError };
      }

      return { data: userProfile };
    } catch (error) {
      console.error('Unexpected error in ensureUserProfile:', error);
      return { error: { message: 'Unexpected error ensuring user profile' } };
    }
  }
}

export const notesHelpers = {
  async getNotes(userId: string, folder?: string) {
    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (folder && folder !== 'all') {
      query = query.eq('folder', folder)
    }

    const { data, error } = await query
    return { data, error }
  },

  async createNote(note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) {
    // Ensure user profile exists before creating note
    const { user } = await authHelpers.getCurrentUser()
    if (!user) {
      return { error: { message: 'User not authenticated' } }
    }

    // Ensure user profile exists
    const { error: profileError } = await authHelpers.ensureUserProfile(
      user.id, 
      user.email || '', 
      user.user_metadata?.full_name
    )
    
    if (profileError) {
      return { error: profileError }
    }

    const { data, error } = await supabase
      .from('notes')
      .insert([note])
      .select()
      .single()
    return { data, error }
  },

  async updateNote(id: string, updates: Partial<Note>) {
    const { data, error } = await supabase
      .from('notes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteNote(id: string) {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
    return { error }
  }
}

export const foldersHelpers = {
  async getFolders(userId: string) {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .order('name')
    return { data, error }
  },

  async createFolder(folder: Omit<Folder, 'id' | 'created_at'>) {
    // Ensure user profile exists before creating folder
    const { user } = await authHelpers.getCurrentUser()
    if (!user) {
      return { error: { message: 'User not authenticated' } }
    }

    // Ensure user profile exists
    const { error: profileError } = await authHelpers.ensureUserProfile(
      user.id, 
      user.email || '', 
      user.user_metadata?.full_name
    )
    
    if (profileError) {
      return { error: profileError }
    }

    const { data, error } = await supabase
      .from('folders')
      .insert([folder])
      .select()
      .single()
    return { data, error }
  },

  async deleteFolder(id: string) {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id)
    return { error }
  }
}

export const tagsHelpers = {
  async getTags(userId: string) {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .order('name')
    return { data, error }
  },

  async createTag(tag: Omit<Tag, 'id' | 'created_at'>) {
    // Ensure user profile exists before creating tag
    const { user } = await authHelpers.getCurrentUser()
    if (!user) {
      return { error: { message: 'User not authenticated' } }
    }

    // Ensure user profile exists
    const { error: profileError } = await authHelpers.ensureUserProfile(
      user.id, 
      user.email || '', 
      user.user_metadata?.full_name
    )
    
    if (profileError) {
      return { error: profileError }
    }

    const { data, error } = await supabase
      .from('tags')
      .insert([tag])
      .select()
      .single()
    return { data, error }
  },

  async updateTag(id: string, updates: Partial<Tag>) {
    const { data, error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteTag(id: string) {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)
    return { error }
  }
}

export const calendarHelpers = {
  async getEvents(userId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .order('start_date')

    if (startDate && endDate) {
      query = query.gte('start_date', startDate).lte('start_date', endDate)
    }

    const { data, error } = await query
    return { data, error }
  },

  async createEvent(event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>) {
    // Ensure user profile exists before creating event
    const { user } = await authHelpers.getCurrentUser()
    if (!user) {
      return { error: { message: 'User not authenticated' } }
    }

    // Ensure user profile exists
    const { error: profileError } = await authHelpers.ensureUserProfile(
      user.id, 
      user.email || '', 
      user.user_metadata?.full_name
    )
    
    if (profileError) {
      return { error: profileError }
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .insert([event])
      .select()
      .single()
    return { data, error }
  },

  async updateEvent(id: string, updates: Partial<CalendarEvent>) {
    const { data, error } = await supabase
      .from('calendar_events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteEvent(id: string) {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
    return { error }
  }
}

export const kanbanHelpers = {
  async getBoards(userId: string) {
    const { data, error } = await supabase
      .from('kanban_boards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at')
    return { data, error }
  },

  async createBoard(board: Omit<KanbanBoard, 'id' | 'created_at' | 'updated_at'>) {
    // Ensure user profile exists before creating board
    const { user } = await authHelpers.getCurrentUser()
    if (!user) {
      return { error: { message: 'User not authenticated' } }
    }

    // Ensure user profile exists
    const { error: profileError } = await authHelpers.ensureUserProfile(
      user.id, 
      user.email || '', 
      user.user_metadata?.full_name
    )
    
    if (profileError) {
      return { error: profileError }
    }

    const { data, error } = await supabase
      .from('kanban_boards')
      .insert([board])
      .select()
      .single()
    return { data, error }
  },

  async updateBoard(id: string, updates: Partial<KanbanBoard>) {
    const { data, error } = await supabase
      .from('kanban_boards')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteBoard(id: string) {
    const { error } = await supabase
      .from('kanban_boards')
      .delete()
      .eq('id', id)
    return { error }
  },

  async getColumns(boardId: string) {
    const { data, error } = await supabase
      .from('kanban_columns')
      .select('*')
      .eq('board_id', boardId)
      .order('order_index')
    return { data, error }
  },

  async createColumn(column: Omit<KanbanColumn, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('kanban_columns')
      .insert([column])
      .select()
      .single()
    return { data, error }
  },

  async updateColumn(id: string, updates: Partial<KanbanColumn>) {
    const { data, error } = await supabase
      .from('kanban_columns')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteColumn(id: string) {
    const { error } = await supabase
      .from('kanban_columns')
      .delete()
      .eq('id', id)
    return { error }
  },

  async getCards(columnId: string) {
    const { data, error } = await supabase
      .from('kanban_cards')
      .select('*')
      .eq('column_id', columnId)
      .order('order_index')
    return { data, error }
  },

  async createCard(card: Omit<KanbanCard, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('kanban_cards')
      .insert([card])
      .select()
      .single()
    return { data, error }
  },

  async updateCard(id: string, updates: Partial<KanbanCard>) {
    const { data, error } = await supabase
      .from('kanban_cards')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteCard(id: string) {
    const { error } = await supabase
      .from('kanban_cards')
      .delete()
      .eq('id', id)
    return { error }
  },

  async moveCard(cardId: string, newColumnId: string, newOrderIndex: number) {
    const { data, error } = await supabase
      .from('kanban_cards')
      .update({ 
        column_id: newColumnId, 
        order_index: newOrderIndex,
        updated_at: new Date().toISOString()
      })
      .eq('id', cardId)
      .select()
      .single()
    return { data, error }
  }
} 