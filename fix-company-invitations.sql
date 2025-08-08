-- Functions to allow invited users to accept/decline their own company invitations under RLS

-- Accept invitation
CREATE OR REPLACE FUNCTION public.accept_company_invitation(
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  UPDATE public.company_members
  SET status = 'accepted', joined_at = NOW()
  WHERE company_id = p_company_id
    AND user_id = v_user_id
    AND status = 'pending';

  RETURN TRUE;
END;
$$;

-- Decline invitation
CREATE OR REPLACE FUNCTION public.decline_company_invitation(
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  UPDATE public.company_members
  SET status = 'declined'
  WHERE company_id = p_company_id
    AND user_id = v_user_id
    AND status = 'pending';

  RETURN TRUE;
END;
$$;

-- Permissions are covered by SECURITY DEFINER and explicit table qualification
GRANT EXECUTE ON FUNCTION public.accept_company_invitation(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decline_company_invitation(UUID) TO anon, authenticated;
