-- Script to fix user profiles and ensure database is properly set up
-- Run this in your Supabase SQL editor

-- First, let's check the current state of user profiles
SELECT 
  'Current User Profile Status' as status,
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as profiles_count,
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL) as missing_profiles_count;

-- Check for any duplicate emails
SELECT 
  'Duplicate Emails Check' as status,
  email,
  COUNT(*) as duplicate_count
FROM public.users
GROUP BY email
HAVING COUNT(*) > 1;

-- Check for users without profiles
SELECT 
  'Users Without Profiles' as status,
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- Verify user profiles using the new function
SELECT * FROM public.verify_user_profiles();

-- Create missing user profiles for existing users
SELECT * FROM public.create_missing_user_profiles();

-- Verify again after creating missing profiles
SELECT * FROM public.verify_user_profiles();

-- Final verification - all users should now have profiles
SELECT 
  'Final Verification' as status,
  au.id,
  au.email,
  CASE WHEN pu.id IS NULL THEN 'Missing Profile' ELSE 'Profile Exists' END as profile_status,
  pu.full_name,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;

-- Test the trigger by checking if it's properly set up
SELECT 
  'Trigger Status' as status,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check RLS policies
SELECT 
  'RLS Policies' as status,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- Grant necessary permissions if not already granted
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Test the ensure_user_profile function
-- This will be used by the application to ensure profiles exist
SELECT 
  'Testing ensure_user_profile function' as status,
  public.ensure_user_profile(
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT email FROM auth.users LIMIT 1),
    'Test User'
  ) as function_result; 