-- =====================================================
-- DIAGNOSTIC SCRIPT TO CHECK RLS POLICIES
-- Run this in Supabase SQL Editor to check if RLS is causing issues
-- =====================================================

-- Check if RLS is enabled on tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'friendships',
    'friend_requests',
    'groups',
    'group_members',
    'availability',
    'availability_shares',
    'hangout_requests'
  )
ORDER BY tablename;

-- Check existing policies
SELECT 
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
  AND tablename IN (
    'profiles',
    'friendships',
    'friend_requests',
    'groups',
    'group_members',
    'availability',
    'availability_shares',
    'hangout_requests'
  )
ORDER BY tablename, policyname;

-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'friendships',
    'friend_requests',
    'groups',
    'group_members',
    'availability',
    'availability_shares',
    'hangout_requests'
  )
ORDER BY table_name;

-- Check if there are any profiles
SELECT COUNT(*) as profile_count FROM profiles;

-- Check if there are any friendships
SELECT COUNT(*) as friendship_count FROM friendships;

-- Check if there are any friend_requests
SELECT COUNT(*) as friend_request_count FROM friend_requests;

-- Check if there are any groups
SELECT COUNT(*) as group_count FROM groups;

-- Check if there are any group_members
SELECT COUNT(*) as group_member_count FROM group_members;

