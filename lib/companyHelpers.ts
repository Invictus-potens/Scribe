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
    // Primary: companies where user is a member
    const primary = await supabase
      .from('companies')
      .select(`
        *,
        company_members!inner(user_id)
      `)
      .eq('company_members.user_id', userId)
      .order('created_at', { ascending: false });

    if (!primary.error) return { data: primary.data as Company[] | null, error: null };

    // Fallback: companies owned by the user (avoids recursive RLS on joins)
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  // Get pending invitations for a specific user (no joins to avoid RLS recursion)
  async getUserInvitations(userId: string): Promise<{ data: CompanyMember[] | null; error: any }> {
    const { data, error } = await supabase
      .from('company_members')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false });

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
    // Avoid recursive joins that can trigger RLS recursion.
    const { data, error } = await supabase
      .from('company_members')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    return { data, error };
  },

  async inviteUserToCompany(companyId: string, userEmail: string, role: 'admin' | 'member' = 'member'): Promise<{ success: boolean; message: string }> {
    // First, try to find the user by email in public.users (profile table)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .maybeSingle();
    let user = userData as { id: string } | null;

    // If not found (common when the profile wasn't created yet), try RPC that reads by email
    if ((!user || userError) && !user) {
      const { data: rpcUser, error: rpcError } = await supabase
        .rpc('get_user_by_email', { user_email: userEmail });
      if (!rpcError && rpcUser && Array.isArray(rpcUser) && rpcUser.length > 0) {
        user = { id: rpcUser[0].id } as any;
      }
    }

    if (!user) {
      return { success: false, message: 'User not found with this email' };
    }

    // Check if user is already a member (no joins)
    const { data: existingMember } = await supabase
      .from('company_members')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      return { success: false, message: 'User is already a member of this company' };
    }

    // Add user to company (owner is enforced by RLS policy)
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

    const ownBoardsFormatted = ownBoards?.map(board => ({
      ...board,
      is_shared: false,
      company_name: null,
      permissions: ['view', 'edit', 'create', 'delete']
    })) || [];

    // Try to get shared boards. If shared tables are missing or error occurs,
    // fall back to returning only the user's own boards so the app keeps working.
    try {
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

      if (sharedError) {
        // Graceful degrade: no shared boards available
        return { data: ownBoardsFormatted, error: null };
      }

      const sharedBoardsFormatted = sharedBoards?.map(share => ({
        ...share.kanban_boards,
        is_shared: true,
        company_name: share.companies.name,
        permissions: ['view', 'edit', 'create', 'delete'] // Default permissions
      })) || [];

      const allBoards = [...ownBoardsFormatted, ...sharedBoardsFormatted];
      return { data: allBoards, error: null };
    } catch {
      // If the shared tables don't exist or any other runtime error occurs,
      // return only own boards.
      return { data: ownBoardsFormatted, error: null };
    }
  }
}; 