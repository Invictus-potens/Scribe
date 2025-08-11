-- Migration: company audit logs, ownership transfer, members-with-profiles RPC, and board permission helpers
-- Apply this in Supabase SQL editor (safe to re-run; guarded where possible)

-- 0) Optional: add permissions column to shared_kanban_boards
-- Uncomment if the column doesn't exist in your environment
-- alter table if exists public.shared_kanban_boards
--   add column if not exists permissions jsonb
--     default '{
--       "view_board": true,
--       "manage_board": false,
--       "manage_columns": true,
--       "create_card": true,
--       "edit_card": true,
--       "move_card": true,
--       "delete_card": false,
--       "manage_members": false
--     }'::jsonb;

-- 1) Auditing table
DO $$ BEGIN
  BEGIN
    CREATE TABLE IF NOT EXISTS public.company_audit_logs (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      action text NOT NULL,
      target_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
      metadata jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now()
    );
  EXCEPTION WHEN duplicate_table THEN NULL; END;
END $$;

-- 2) Logging helper
CREATE OR REPLACE FUNCTION public.log_company_action(
  p_company_id uuid,
  p_action text,
  p_target_user_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.company_audit_logs (company_id, actor_user_id, action, target_user_id, metadata)
  VALUES (p_company_id, auth.uid(), p_action, p_target_user_id, coalesce(p_metadata, '{}'::jsonb));
END;
$$;

-- 3) Ownership transfer
CREATE OR REPLACE FUNCTION public.transfer_company_ownership(
  p_company_id uuid,
  p_new_owner_user_id uuid
)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_owner uuid;
  v_new_owner_exists boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Not authenticated';
    RETURN;
  END IF;

  SELECT owner_id INTO v_current_owner FROM public.companies WHERE id = p_company_id;
  IF v_current_owner IS NULL OR v_current_owner <> auth.uid() THEN
    RETURN QUERY SELECT FALSE, 'Only the current owner can transfer ownership';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = p_company_id
      AND user_id = p_new_owner_user_id
      AND status = 'accepted'
  ) INTO v_new_owner_exists;

  IF NOT v_new_owner_exists THEN
    RETURN QUERY SELECT FALSE, 'New owner must be an accepted member of the company';
    RETURN;
  END IF;

  UPDATE public.companies
    SET owner_id = p_new_owner_user_id, updated_at = now()
    WHERE id = p_company_id;

  UPDATE public.company_members
    SET role = 'admin'
    WHERE company_id = p_company_id AND user_id = v_current_owner;

  UPDATE public.company_members
    SET role = 'owner'
    WHERE company_id = p_company_id AND user_id = p_new_owner_user_id;

  PERFORM public.log_company_action(p_company_id, 'ownership_transferred', p_new_owner_user_id, '{}'::jsonb);

  RETURN QUERY SELECT TRUE, 'Ownership transferred';
END;
$$;

-- 4) Members with profiles (safe under RLS)
CREATE OR REPLACE FUNCTION public.get_company_members_with_profiles(
  p_company_id uuid
)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  user_id uuid,
  role text,
  invited_by uuid,
  invited_at timestamptz,
  joined_at timestamptz,
  status text,
  user_full_name text,
  user_email text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT cm.id, cm.company_id, cm.user_id, cm.role, cm.invited_by, cm.invited_at, cm.joined_at, cm.status,
         u.full_name AS user_full_name, u.email AS user_email
  FROM public.company_members cm
  JOIN public.users u ON u.id = cm.user_id
  WHERE cm.company_id = p_company_id
    AND EXISTS (
      SELECT 1 FROM public.company_members cm2
      WHERE cm2.company_id = p_company_id AND cm2.user_id = auth.uid()
    )
  ORDER BY cm.invited_at ASC;
$$;

-- 5) Wire audit logs into invites and role updates (optional, re-creates functions from your repo)
DROP FUNCTION IF EXISTS public.invite_user_to_company(uuid, text, text);
CREATE OR REPLACE FUNCTION public.invite_user_to_company(
  p_company_id uuid,
  p_user_email text,
  p_role text DEFAULT 'member'
)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target_user_id uuid;
  v_is_member boolean;
  v_has_pending boolean;
  v_is_owner_or_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Not authenticated';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.company_members cm1
    WHERE cm1.company_id = p_company_id
      AND cm1.user_id = auth.uid()
      AND cm1.status = 'accepted'
      AND cm1.role IN ('owner','admin')
  ) INTO v_is_owner_or_admin;

  IF NOT v_is_owner_or_admin THEN
    RETURN QUERY SELECT FALSE, 'Not allowed to invite for this company';
    RETURN;
  END IF;

  SELECT id FROM public.users WHERE email = p_user_email LIMIT 1 INTO v_target_user_id;
  IF v_target_user_id IS NULL THEN
    SELECT id FROM auth.users WHERE email = p_user_email LIMIT 1 INTO v_target_user_id;
  END IF;

  IF v_target_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not found with this email';
    RETURN;
  END IF;

  IF v_target_user_id = auth.uid() THEN
    RETURN QUERY SELECT FALSE, 'You cannot invite yourself';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.company_members cm2
    WHERE cm2.company_id = p_company_id AND cm2.user_id = v_target_user_id AND cm2.status = 'accepted'
  ) INTO v_is_member;
  IF v_is_member THEN
    RETURN QUERY SELECT FALSE, 'User is already a member of this company';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.company_members cm3
    WHERE cm3.company_id = p_company_id AND cm3.user_id = v_target_user_id AND cm3.status = 'pending'
  ) INTO v_has_pending;
  IF v_has_pending THEN
    RETURN QUERY SELECT FALSE, 'An invitation is already pending for this user';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.company_members cm4
    WHERE cm4.company_id = p_company_id AND cm4.user_id = v_target_user_id
  ) THEN
    UPDATE public.company_members cmu
      SET role = (CASE WHEN coalesce(p_role,'member') IN ('owner','admin','member') THEN coalesce(p_role,'member') ELSE 'member' END),
          status = 'pending',
          invited_by = auth.uid(),
          invited_at = now(),
          joined_at = NULL
    WHERE cmu.company_id = p_company_id AND cmu.user_id = v_target_user_id;
  ELSE
    INSERT INTO public.company_members (company_id, user_id, role, status, invited_by, invited_at)
    VALUES (
      p_company_id,
      v_target_user_id,
      CASE WHEN coalesce(p_role,'member') IN ('owner','admin','member') THEN coalesce(p_role,'member') ELSE 'member' END,
      'pending',
      auth.uid(),
      now()
    );
  END IF;

  PERFORM public.log_company_action(p_company_id, 'invite_sent', v_target_user_id, jsonb_build_object('role', coalesce(p_role,'member')));
  RETURN QUERY SELECT TRUE, 'User invited successfully';
END;
$$;

CREATE OR REPLACE FUNCTION public.update_company_member_role(
  p_company_id uuid,
  p_target_user_id uuid,
  p_new_role text
)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_requester_role text;
  v_target_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Not authenticated';
    RETURN;
  END IF;

  SELECT role FROM public.company_members
  WHERE company_id = p_company_id AND user_id = auth.uid() AND status = 'accepted'
  INTO v_requester_role;

  IF v_requester_role IS NULL OR v_requester_role NOT IN ('owner','admin') THEN
    RETURN QUERY SELECT FALSE, 'Not allowed to update roles';
    RETURN;
  END IF;

  SELECT role FROM public.company_members
  WHERE company_id = p_company_id AND user_id = p_target_user_id
  INTO v_target_role;

  IF v_target_role IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Target user is not a member';
    RETURN;
  END IF;

  IF v_target_role = 'owner' THEN
    RETURN QUERY SELECT FALSE, 'Cannot change role of the owner';
    RETURN;
  END IF;

  UPDATE public.company_members
    SET role = (CASE WHEN coalesce(p_new_role,'member') IN ('owner','admin','member') THEN coalesce(p_new_role,'member') ELSE 'member' END)
  WHERE company_id = p_company_id AND user_id = p_target_user_id;

  PERFORM public.log_company_action(p_company_id, 'role_updated', p_target_user_id, jsonb_build_object('new_role', p_new_role));
  RETURN QUERY SELECT TRUE, 'Role updated';
END;
$$;


