-- Companies table
CREATE TABLE public.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company Members table
CREATE TABLE public.company_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  invited_by UUID REFERENCES public.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  UNIQUE(company_id, user_id)
);

-- Shared Kanban Boards table
CREATE TABLE public.shared_kanban_boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES public.users(id),
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(board_id, company_id)
);

-- Create indexes
CREATE INDEX idx_companies_owner_id ON public.companies(owner_id);
CREATE INDEX idx_company_members_company_id ON public.company_members(company_id);
CREATE INDEX idx_company_members_user_id ON public.company_members(user_id);
CREATE INDEX idx_shared_kanban_boards_board_id ON public.shared_kanban_boards(board_id);
CREATE INDEX idx_shared_kanban_boards_company_id ON public.shared_kanban_boards(company_id);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_kanban_boards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies table
CREATE POLICY "Users can view companies they are members of" ON public.companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.company_members 
      WHERE company_id = companies.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create companies" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Company owners can update their companies" ON public.companies
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Company owners can delete their companies" ON public.companies
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for company_members table
CREATE POLICY "Users can view company members of companies they belong to" ON public.company_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm2
      WHERE cm2.company_id = company_members.company_id AND cm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Company owners and admins can manage members" ON public.company_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_members.company_id 
      AND cm.user_id = auth.uid() 
      AND cm.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for shared_kanban_boards table
CREATE POLICY "Users can view shared boards of companies they belong to" ON public.shared_kanban_boards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.company_members 
      WHERE company_id = shared_kanban_boards.company_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Board owners can share their boards" ON public.shared_kanban_boards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.kanban_boards 
      WHERE id = board_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Board owners can update sharing settings" ON public.shared_kanban_boards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.kanban_boards 
      WHERE id = board_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Board owners can remove sharing" ON public.shared_kanban_boards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.kanban_boards 
      WHERE id = board_id AND user_id = auth.uid()
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to invite user to company
CREATE OR REPLACE FUNCTION invite_user_to_company(
  company_id UUID,
  user_email TEXT,
  role TEXT DEFAULT 'member'
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  invited_user_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if current user is owner or admin of the company
  IF NOT EXISTS (
    SELECT 1 FROM public.company_members 
    WHERE company_id = invite_user_to_company.company_id 
    AND user_id = current_user_id 
    AND role IN ('owner', 'admin')
  ) THEN
    RETURN QUERY SELECT FALSE, 'You do not have permission to invite users to this company';
    RETURN;
  END IF;
  
  -- Find user by email
  SELECT id INTO invited_user_id 
  FROM public.users 
  WHERE email = user_email;
  
  IF invited_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not found with this email';
    RETURN;
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.company_members 
    WHERE company_id = invite_user_to_company.company_id 
    AND user_id = invited_user_id
  ) THEN
    RETURN QUERY SELECT FALSE, 'User is already a member of this company';
    RETURN;
  END IF;
  
  -- Add user to company
  INSERT INTO public.company_members (company_id, user_id, role, invited_by)
  VALUES (invite_user_to_company.company_id, invited_user_id, role, current_user_id);
  
  RETURN QUERY SELECT TRUE, 'User invited successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's accessible boards (own + shared)
CREATE OR REPLACE FUNCTION get_user_accessible_boards(user_id UUID)
RETURNS TABLE(
  board_id UUID,
  board_title TEXT,
  board_owner_id UUID,
  board_owner_email TEXT,
  is_shared BOOLEAN,
  company_id UUID,
  company_name TEXT,
  permissions TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  -- User's own boards
  SELECT 
    kb.id as board_id,
    kb.title as board_title,
    kb.user_id as board_owner_id,
    u.email as board_owner_email,
    FALSE as is_shared,
    NULL::UUID as company_id,
    NULL::TEXT as company_name,
    ARRAY['view', 'edit', 'create', 'delete']::TEXT[] as permissions
  FROM public.kanban_boards kb
  JOIN public.users u ON kb.user_id = u.id
  WHERE kb.user_id = get_user_accessible_boards.user_id
  
  UNION ALL
  
  -- Shared boards from companies user is member of
  SELECT 
    kb.id as board_id,
    kb.title as board_title,
    kb.user_id as board_owner_id,
    u.email as board_owner_email,
    TRUE as is_shared,
    c.id as company_id,
    c.name as company_name,
    skb.permissions
  FROM public.shared_kanban_boards skb
  JOIN public.kanban_boards kb ON skb.board_id = kb.id
  JOIN public.companies c ON skb.company_id = c.id
  JOIN public.users u ON kb.user_id = u.id
  JOIN public.company_members cm ON c.id = cm.company_id
  WHERE cm.user_id = get_user_accessible_boards.user_id
  AND cm.status = 'accepted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.companies TO anon, authenticated;
GRANT ALL ON public.company_members TO anon, authenticated;
GRANT ALL ON public.shared_kanban_boards TO anon, authenticated; 