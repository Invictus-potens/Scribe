import { supabase } from './supabase';

export interface Company {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface SharedKanbanBoard {
  id: string;
  board_id: string;
  company_id: string;
  shared_by: string;
  shared_at: string;
}

export const companyHelpers = {
  // Companies
  async getCompanies(userId: string): Promise<{ data: Company[] | null; error: any }> {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        company_members!inner(user_id)
      `)
      .eq('company_members.user_id', userId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  async createCompany(userId: string, name: string, description?: string): Promise<{ data: Company | null; error: any }> {
    const { data, error } = await supabase
      .from('companies')
      .insert([{ owner_id: userId, name, description }])
      .select()
      .single();

    if (data && !error) {
      // Add owner as member
      await supabase
        .from('company_members')
        .insert([{
          company_id: data.id,
          user_id: userId,
          role: 'owner',
          status: 'accepted',
          joined_at: new Date().toISOString()
        }]);
    }

    return { data, error };
  },

  async updateCompany(companyId: string, name: string, description?: string): Promise<{ data: Company | null; error: any }> {
    const { data, error } = await supabase
      .from('companies')
      .update({ name, description })
      .eq('id', companyId)
      .select()
      .single();

    return { data, error };
  },

  async deleteCompany(companyId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId);

    return { error };
  },

  // Company Members
  async getCompanyMembers(companyId: string): Promise<{ data: CompanyMember[] | null; error: any }> {
    const { data, error } = await supabase
      .from('company_members')
      .select(`
        *,
        users!inner(id, email, full_name)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    return { data, error };
  },

  async inviteUserToCompany(companyId: string, userEmail: string, role: 'admin' | 'member' = 'member'): Promise<{ success: boolean; message: string }> {
    // First, find the user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      return { success: false, message: 'User not found with this email' };
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('company_members')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return { success: false, message: 'User is already a member of this company' };
    }

    // Add user to company
    const { error } = await supabase
      .from('company_members')
      .insert([{
        company_id: companyId,
        user_id: user.id,
        role,
        status: 'pending'
      }]);

    if (error) {
      return { success: false, message: 'Failed to invite user' };
    }

    return { success: true, message: 'User invited successfully' };
  },

  async acceptInvitation(companyId: string, userId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('company_members')
      .update({ 
        status: 'accepted',
        joined_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('user_id', userId);

    return { error };
  },

  async declineInvitation(companyId: string, userId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('company_members')
      .update({ status: 'declined' })
      .eq('company_id', companyId)
      .eq('user_id', userId);

    return { error };
  },

  async removeMember(companyId: string, userId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('company_members')
      .delete()
      .eq('company_id', companyId)
      .eq('user_id', userId);

    return { error };
  },

  // Shared Kanban Boards
  async shareBoardWithCompany(boardId: string, companyId: string, userId: string): Promise<{ data: SharedKanbanBoard | null; error: any }> {
    const { data, error } = await supabase
      .from('shared_kanban_boards')
      .insert([{
        board_id: boardId,
        company_id: companyId,
        shared_by: userId
      }])
      .select()
      .single();

    return { data, error };
  },

  async unshareBoardFromCompany(boardId: string, companyId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('shared_kanban_boards')
      .delete()
      .eq('board_id', boardId)
      .eq('company_id', companyId);

    return { error };
  },

  async getSharedBoards(companyId: string): Promise<{ data: any[] | null; error: any }> {
    const { data, error } = await supabase
      .from('shared_kanban_boards')
      .select(`
        *,
        kanban_boards!inner(*),
        companies!inner(name)
      `)
      .eq('company_id', companyId)
      .order('shared_at', { ascending: false });

    return { data, error };
  },

  // Get user's accessible boards (own + shared)
  async getUserAccessibleBoards(userId: string): Promise<{ data: any[] | null; error: any }> {
    // Get user's own boards
    const { data: ownBoards, error: ownError } = await supabase
      .from('kanban_boards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ownError) return { data: null, error: ownError };

    // Get shared boards from companies user is member of
    const { data: sharedBoards, error: sharedError } = await supabase
      .from('shared_kanban_boards')
      .select(`
        *,
        kanban_boards!inner(*),
        companies!inner(name),
        company_members!inner(user_id, status)
      `)
      .eq('company_members.user_id', userId)
      .eq('company_members.status', 'accepted')
      .order('shared_at', { ascending: false });

    if (sharedError) return { data: null, error: sharedError };

    // Combine and format the data
    const ownBoardsFormatted = ownBoards?.map(board => ({
      ...board,
      is_shared: false,
      company_name: null,
      permissions: ['view', 'edit', 'create', 'delete']
    })) || [];

    const sharedBoardsFormatted = sharedBoards?.map(share => ({
      ...share.kanban_boards,
      is_shared: true,
      company_name: share.companies.name,
      permissions: ['view', 'edit', 'create', 'delete'] // Default permissions
    })) || [];

    const allBoards = [...ownBoardsFormatted, ...sharedBoardsFormatted];

    return { data: allBoards, error: null };
  }
}; 