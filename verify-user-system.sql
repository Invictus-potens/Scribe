-- Comprehensive User System Verification Script
-- Run this in your Supabase SQL editor to verify everything is working

-- 1. Check database extensions
SELECT 
  'Database Extensions' as check_type,
  extname as extension_name,
  extversion as version
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto');

-- 2. Check table structure
SELECT 
  'Table Structure' as check_type,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. Check constraints
SELECT 
  'Table Constraints' as check_type,
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
AND table_name = 'users';

-- 4. Check indexes
SELECT 
  'Table Indexes' as check_type,
  indexname as index_name,
  indexdef as index_definition
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- 5. Check RLS status
SELECT 
  'RLS Status' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- 6. Check RLS policies
SELECT 
  'RLS Policies' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- 7. Check functions
SELECT 
  'Functions' as check_type,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'handle_new_user',
  'create_missing_user_profiles',
  'verify_user_profiles',
  'ensure_user_profile',
  'get_user_by_email'
);

-- 8. Check triggers
SELECT 
  'Triggers' as check_type,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table = 'users';

-- 9. Verify user profiles status
SELECT * FROM public.verify_user_profiles();

-- 10. Check for any duplicate emails
SELECT 
  'Duplicate Emails' as check_type,
  email,
  COUNT(*) as count
FROM public.users
GROUP BY email
HAVING COUNT(*) > 1;

-- 11. Check auth users vs profiles
SELECT 
  'Auth vs Profiles Comparison' as check_type,
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as profiles_count,
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL) as missing_profiles,
  (SELECT COUNT(*) FROM public.users pu LEFT JOIN auth.users au ON pu.id = au.id WHERE au.id IS NULL) as orphaned_profiles;

-- 12. Test the ensure_user_profile function
DO $$
DECLARE
  test_user_id UUID;
  test_email TEXT;
  result BOOLEAN;
BEGIN
  -- Get a test user
  SELECT id, email INTO test_user_id, test_email 
  FROM auth.users 
  LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test the function
    SELECT public.ensure_user_profile(test_user_id, test_email, 'Test User') INTO result;
    
    RAISE NOTICE 'Test ensure_user_profile function: User ID: %, Email: %, Result: %', 
      test_user_id, test_email, result;
  ELSE
    RAISE NOTICE 'No auth users found to test with';
  END IF;
END $$;

-- 13. Check permissions
SELECT 
  'Permissions' as check_type,
  grantee,
  table_name,
  privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND grantee IN ('anon', 'authenticated');

-- 14. Test user creation simulation
DO $$
DECLARE
  test_uuid UUID := gen_random_uuid();
  test_email TEXT := 'test_' || test_uuid::text || '@example.com';
  result BOOLEAN;
BEGIN
  -- Test creating a profile for a non-existent auth user
  SELECT public.ensure_user_profile(test_uuid, test_email, 'Test User') INTO result;
  
  RAISE NOTICE 'Test user profile creation: UUID: %, Email: %, Result: %', 
    test_uuid, test_email, result;
    
  -- Clean up test data
  DELETE FROM public.users WHERE id = test_uuid;
END $$;

-- 15. Final status report
SELECT 
  'FINAL STATUS REPORT' as status,
  CASE 
    WHEN (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM public.users) 
    THEN '✅ All auth users have profiles'
    ELSE '❌ Some auth users missing profiles'
  END as profile_status,
  CASE 
    WHEN (SELECT COUNT(*) FROM (
      SELECT email FROM public.users GROUP BY email HAVING COUNT(*) > 1
    )) = 0 
    THEN '✅ No duplicate emails'
    ELSE '❌ Duplicate emails found'
  END as email_status,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') > 0
    THEN '✅ User creation trigger exists'
    ELSE '❌ User creation trigger missing'
  END as trigger_status,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'users') >= 3
    THEN '✅ RLS policies configured'
    ELSE '❌ RLS policies missing'
  END as rls_status; 