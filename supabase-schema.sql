-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends auth.users from Supabase Auth)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Folders table
CREATE TABLE public.folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags table
CREATE TABLE public.tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar Events table
CREATE TABLE public.calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT '#3b82f6',
  reminder_minutes INTEGER,
  reminder_set BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table
CREATE TABLE public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  folder TEXT,
  tags TEXT[],
  is_pinned BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_folders_user_id ON public.folders(user_id);
CREATE INDEX idx_tags_user_id ON public.tags(user_id);
CREATE INDEX idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_date ON public.calendar_events(start_date);
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_folder ON public.notes(folder);
CREATE INDEX idx_notes_updated_at ON public.notes(updated_at DESC);
CREATE INDEX idx_users_email ON public.users(email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for folders table
CREATE POLICY "Users can view own folders" ON public.folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders" ON public.folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON public.folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON public.folders
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for tags table
CREATE POLICY "Users can view own tags" ON public.tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags" ON public.tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" ON public.tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" ON public.tags
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for calendar_events table
CREATE POLICY "Users can view own events" ON public.calendar_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON public.calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON public.calendar_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON public.calendar_events
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for notes table
CREATE POLICY "Users can view own notes" ON public.notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes" ON public.notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON public.notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON public.notes
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enhanced function to automatically create user profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user profile already exists to avoid duplicates
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    -- Insert user profile with proper error handling
    BEGIN
      INSERT INTO public.users (id, email, full_name)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL)
      );
      
      -- Log successful user creation
      RAISE NOTICE 'User profile created for: %', NEW.email;
    EXCEPTION
      WHEN unique_violation THEN
        -- Handle duplicate email case
        RAISE NOTICE 'User with email % already exists', NEW.email;
      WHEN OTHERS THEN
        -- Log any other errors
        RAISE NOTICE 'Error creating user profile: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to cleanup past events (optional)
CREATE OR REPLACE FUNCTION cleanup_past_events()
RETURNS void AS $$
BEGIN
  DELETE FROM public.calendar_events 
  WHERE start_date < CURRENT_DATE - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Enhanced function to manually create user profiles for existing users
DROP FUNCTION IF EXISTS public.create_missing_user_profiles();
CREATE OR REPLACE FUNCTION public.create_missing_user_profiles()
RETURNS TABLE(created_count INTEGER, error_count INTEGER) AS $$
DECLARE
  auth_user RECORD;
  created_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  -- Loop through all auth.users that don't have corresponding profiles
  FOR auth_user IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.users (id, email, full_name)
      VALUES (
        auth_user.id,
        auth_user.email,
        COALESCE(auth_user.raw_user_meta_data->>'full_name', auth_user.raw_user_meta_data->>'name', NULL)
      );
      created_count := created_count + 1;
      RAISE NOTICE 'Created profile for user: %', auth_user.email;
    EXCEPTION
      WHEN unique_violation THEN
        error_count := error_count + 1;
        RAISE NOTICE 'Duplicate email found for user: %', auth_user.email;
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE NOTICE 'Error creating profile for user %: %', auth_user.email, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT created_count, error_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify and fix user profiles
DROP FUNCTION IF EXISTS public.verify_user_profiles();
CREATE OR REPLACE FUNCTION public.verify_user_profiles()
RETURNS TABLE(
  total_auth_users INTEGER,
  total_profiles INTEGER,
  missing_profiles INTEGER,
  duplicate_emails INTEGER
) AS $$
DECLARE
  auth_count INTEGER;
  profile_count INTEGER;
  missing_count INTEGER;
  duplicate_count INTEGER;
BEGIN
  -- Count auth users
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  
  -- Count profiles
  SELECT COUNT(*) INTO profile_count FROM public.users;
  
  -- Count missing profiles
  SELECT COUNT(*) INTO missing_count 
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;
  
  -- Count duplicate emails
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT email, COUNT(*) as email_count
    FROM public.users
    GROUP BY email
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RETURN QUERY SELECT auth_count, profile_count, missing_count, duplicate_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile by email
DROP FUNCTION IF EXISTS public.get_user_by_email(TEXT);
CREATE OR REPLACE FUNCTION public.get_user_by_email(user_email TEXT)
RETURNS TABLE(
  id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.full_name, u.created_at
  FROM public.users u
  WHERE u.email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure user profile exists (for use in application)
DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user profile exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
    -- Create user profile
    BEGIN
      INSERT INTO public.users (id, email, full_name)
      VALUES (user_id, user_email, user_full_name);
      RETURN TRUE;
    EXCEPTION
      WHEN unique_violation THEN
        -- Handle duplicate email
        RAISE NOTICE 'User with email % already exists', user_email;
        RETURN FALSE;
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creating user profile: %', SQLERRM;
        RETURN FALSE;
    END;
  ELSE
    -- Profile already exists
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kanban Boards table
CREATE TABLE public.kanban_boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kanban Columns table
CREATE TABLE public.kanban_columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kanban Cards table
CREATE TABLE public.kanban_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  column_id UUID REFERENCES public.kanban_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  due_date DATE,
  tags TEXT[],
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for Kanban tables
CREATE INDEX idx_kanban_boards_user_id ON public.kanban_boards(user_id);
CREATE INDEX idx_kanban_columns_board_id ON public.kanban_columns(board_id);
CREATE INDEX idx_kanban_cards_column_id ON public.kanban_cards(column_id);

-- Enable RLS for Kanban tables
ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kanban_boards table
CREATE POLICY "Users can view own boards" ON public.kanban_boards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own boards" ON public.kanban_boards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own boards" ON public.kanban_boards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own boards" ON public.kanban_boards
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for kanban_columns table
CREATE POLICY "Users can view own columns" ON public.kanban_columns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.kanban_boards 
      WHERE id = kanban_columns.board_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own columns" ON public.kanban_columns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.kanban_boards 
      WHERE id = kanban_columns.board_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own columns" ON public.kanban_columns
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.kanban_boards 
      WHERE id = kanban_columns.board_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own columns" ON public.kanban_columns
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.kanban_boards 
      WHERE id = kanban_columns.board_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for kanban_cards table
CREATE POLICY "Users can view own cards" ON public.kanban_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.kanban_columns kc
      JOIN public.kanban_boards kb ON kc.board_id = kb.id
      WHERE kc.id = kanban_cards.column_id AND kb.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own cards" ON public.kanban_cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.kanban_columns kc
      JOIN public.kanban_boards kb ON kc.board_id = kb.id
      WHERE kc.id = kanban_cards.column_id AND kb.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own cards" ON public.kanban_cards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.kanban_columns kc
      JOIN public.kanban_boards kb ON kc.board_id = kb.id
      WHERE kc.id = kanban_cards.column_id AND kb.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own cards" ON public.kanban_cards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.kanban_columns kc
      JOIN public.kanban_boards kb ON kc.board_id = kb.id
      WHERE kc.id = kanban_cards.column_id AND kb.user_id = auth.uid()
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_kanban_boards_updated_at BEFORE UPDATE ON public.kanban_boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kanban_columns_updated_at BEFORE UPDATE ON public.kanban_columns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kanban_cards_updated_at BEFORE UPDATE ON public.kanban_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated; 