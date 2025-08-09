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

export interface BoardPermissions {
  view_board: boolean;
  manage_board: boolean;
  manage_columns: boolean;
  create_card: boolean;
  edit_card: boolean;
  move_card: boolean;
  delete_card: boolean;
  manage_members: boolean;
}

export interface AccessibleBoardMeta {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_shared: boolean;
  company_name: string | null;
  permissions: BoardPermissions;
}

export const companyHelpers = {
  // Companies
  async getCompanies(userId: string): Promise<{ data: Company[] | null; error: any }> {
    // Primary: companies where user is a member
    const primary = await supabase
      .from('companies')
      .select(`
        *,
        company_members!inner(user_id, status)
      `)
      .eq('company_members.user_id', userId)
      .eq('company_members.status', 'accepted')
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
    // userId is inferred from auth context on the RPC
    const { data, error } = await supabase
      .rpc('create_company_with_owner', {
        p_name: name,
        p_description: description ?? null
      });
    return { data: (data as Company) ?? null, error };
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
      .order('invited_at', { ascending: true });

    return { data, error };
  },

  async updateMemberRole(
    companyId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member'
  ): Promise<{ error: any }> {
    const { data, error } = await supabase.rpc('update_company_member_role', {
      p_company_id: companyId,
      p_target_user_id: userId,
      p_new_role: role
    });
    if (error) return { error };
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.success) {
      return { error: { message: result?.message || 'Failed to update role' } };
    }
    return { error: null };
  },

  async inviteUserToCompany(companyId: string, userEmail: string, role: 'admin' | 'member' = 'member'): Promise<{ success: boolean; message: string }> {
    const { data, error } = await supabase.rpc('invite_user_to_company', {
      p_company_id: companyId,
      p_user_email: userEmail,
      p_role: role
    });
    if (error) {
      // Log completo para debug no console e retornar motivo legível
      // @ts-expect-error supabase error can have details/hint/Code
      const details = error.details || error.hint || '';
      const code = (error as any).code ? ` [${(error as any).code}]` : '';
      const message = `${error.message || 'Failed to invite user'}${code}${details ? `: ${details}` : ''}`;
      console.error('invite_user_to_company RPC error:', { error });
      return { success: false, message };
    }
    const result = Array.isArray(data) ? data[0] : data;
    return { success: !!result?.success, message: result?.message || '' };
  },

  async acceptInvitation(companyId: string, _userId: string): Promise<{ error: any }> {
    // Prefer RPC to satisfy RLS safely: only invited user can accept own invite
    const { error } = await supabase.rpc('accept_company_invitation', {
      p_company_id: companyId
    });

    return { error };
  },

  async declineInvitation(companyId: string, _userId: string): Promise<{ error: any }> {
    // Prefer RPC to satisfy RLS safely: only invited user can decline own invite
    const { error } = await supabase.rpc('decline_company_invitation', {
      p_company_id: companyId
    });

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
  async shareBoardWithCompany(
    boardId: string,
    companyId: string,
    userId: string,
    permissions?: BoardPermissions
  ): Promise<{ data: SharedKanbanBoard | null; error: any }> {
    // Upsert para evitar violar unique(board_id, company_id)
    const insertPayload: any = {
      board_id: boardId,
      company_id: companyId,
      shared_by: userId,
      ...(permissions ? { permissions } : {})
    };

    // Tenta update primeiro; se não existir, faz insert
    const { data: updated, error: updateError } = await supabase
      .from('shared_kanban_boards')
      .update({ permissions: permissions as any, shared_by: userId })
      .eq('board_id', boardId)
      .eq('company_id', companyId)
      .select()
      .maybeSingle();

    if (!updateError && updated) {
      return { data: updated as any, error: null };
    }

    const { data, error } = await supabase
      .from('shared_kanban_boards')
      .insert([insertPayload])
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
        permissions,
        kanban_boards!inner(*),
        companies!inner(name)
      `)
      .eq('company_id', companyId)
      .order('shared_at', { ascending: false });

    return { data, error };
  },

  // Get user's accessible boards (own + shared)
  async getUserAccessibleBoards(): Promise<{ data: AccessibleBoardMeta[] | null; error: any }> {
    const { data, error } = await supabase.rpc('get_user_accessible_boards');
    if (error) return { data: null, error };
    // Supabase might return snake_case keys as-is; cast to our interface
    const boards = (data as any[]).map((row) => ({
      id: row.id,
      title: row.title,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_shared: row.is_shared,
      company_name: row.company_name ?? null,
      permissions: row.permissions as BoardPermissions
    })) as AccessibleBoardMeta[];
    return { data: boards, error: null };
  }
}; 