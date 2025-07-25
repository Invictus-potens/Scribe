-- Script to fix function creation errors
-- Run this in your Supabase SQL editor

-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS public.create_missing_user_profiles();
DROP FUNCTION IF EXISTS public.verify_user_profiles();
DROP FUNCTION IF EXISTS public.get_user_by_email(TEXT);
DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID, TEXT, TEXT);

-- Recreate the functions with proper signatures

-- Enhanced function to manually create user profiles for existing users
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

-- Grant permissions to the functions
GRANT EXECUTE ON FUNCTION public.create_missing_user_profiles() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_user_profiles() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_by_email(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID, TEXT, TEXT) TO anon, authenticated;

-- Test the functions
SELECT 'Testing create_missing_user_profiles function' as test_name;
SELECT * FROM public.create_missing_user_profiles();

SELECT 'Testing verify_user_profiles function' as test_name;
SELECT * FROM public.verify_user_profiles();

SELECT 'Testing ensure_user_profile function' as test_name;
SELECT public.ensure_user_profile(
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT email FROM auth.users LIMIT 1),
  'Test User'
) as function_result; 