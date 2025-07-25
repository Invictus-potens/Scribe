# Fix for User Profile Creation Issue

## Problem
The error `Key is not present in table "users"` occurs when trying to create notes, folders, tags, calendar events, or kanban boards. This happens because user profiles are not being automatically created in the `users` table when users sign up.

## Solution

### 1. Update Database Schema
Run the updated `supabase-schema.sql` file in your Supabase SQL editor. This includes:
- Improved trigger function `handle_new_user()` that properly creates user profiles
- Function `create_missing_user_profiles()` to fix existing users
- Better error handling and duplicate prevention

### 2. Fix Existing User Profiles
Run the `fix-user-profiles.sql` script in your Supabase SQL editor to:
- Check which users are missing profiles
- Create missing profiles for existing users
- Verify the trigger is properly set up

### 3. Code Changes Made
The following changes have been made to prevent this issue:

#### `lib/supabase.ts`
- Added `ensureUserProfile()` function to check and create user profiles
- Updated all helper functions (`notesHelpers`, `foldersHelpers`, `tagsHelpers`, `calendarHelpers`, `kanbanHelpers`) to ensure user profiles exist before creating data
- Better error handling and authentication checks

#### `components/NotesEditor.tsx`
- Improved error handling with user-friendly error messages
- Better authentication state checking

#### `supabase-schema.sql`
- Enhanced trigger function with duplicate prevention
- Added function to manually create missing user profiles
- Improved permissions and security

## Steps to Apply the Fix

1. **Update your Supabase database:**
   - Go to your Supabase dashboard
   - Navigate to the SQL Editor
   - Run the updated `supabase-schema.sql` file

2. **Fix existing user profiles:**
   - Run the `fix-user-profiles.sql` script in the SQL Editor

3. **Deploy the updated code:**
   - The updated TypeScript files will automatically ensure user profiles exist before creating any data

## Verification

After applying the fix, you can verify it's working by:

1. **Creating a new user account** - The profile should be automatically created
2. **Creating notes, folders, tags, etc.** - Should work without the foreign key error
3. **Checking the database** - All users should have corresponding entries in the `users` table

## Prevention

The updated code now includes:
- Automatic user profile creation on signup (via database trigger)
- Fallback profile creation in the application code
- Better error handling and user feedback
- Duplicate prevention to avoid conflicts

This ensures that users can always insert their data into all the tables (notes, folders, tags, calendar events, kanban boards) without encountering foreign key constraint errors. 