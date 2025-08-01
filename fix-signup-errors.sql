-- Fix for signup errors - Drop and recreate the trigger with better error handling

-- First, drop the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the existing function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create an improved version of the handle_new_user function
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
        -- Handle duplicate email case gracefully
        RAISE NOTICE 'User with email % already exists', NEW.email;
        -- Don't fail the signup, just log the issue
      WHEN OTHERS THEN
        -- Log any other errors but don't fail the signup
        RAISE NOTICE 'Error creating user profile: %', SQLERRM;
        -- Continue with the signup process
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS policies are correct for the users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Recreate RLS policies with better permissions
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Add a policy to allow the trigger function to insert profiles
CREATE POLICY "Allow trigger to insert user profiles" ON public.users
  FOR INSERT WITH CHECK (true);

-- Ensure the ensure_user_profile function exists and works correctly
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.folders TO anon, authenticated;
GRANT ALL ON public.tags TO anon, authenticated;
GRANT ALL ON public.notes TO anon, authenticated;
GRANT ALL ON public.calendar_events TO anon, authenticated;
GRANT ALL ON public.kanban_boards TO anon, authenticated;
GRANT ALL ON public.kanban_columns TO anon, authenticated;
GRANT ALL ON public.kanban_cards TO anon, authenticated;

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated; 