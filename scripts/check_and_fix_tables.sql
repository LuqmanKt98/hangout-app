-- =====================================================
-- CHECK AND FIX TABLE ISSUES
-- This script checks for common issues and fixes them
-- =====================================================

-- First, let's check if all required tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
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

-- Check for foreign key constraints that might be causing issues
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('hangout_requests', 'availability', 'availability_shares', 'group_members')
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;

-- Check columns in problematic tables
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('hangout_requests', 'availability', 'availability_shares', 'group_members')
ORDER BY table_name, ordinal_position;

-- Check if there are any invalid foreign key references
-- This query will show if there are any orphaned records
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Check hangout_requests for invalid sender_id
  FOR r IN 
    SELECT hr.id, hr.sender_id 
    FROM hangout_requests hr 
    LEFT JOIN profiles p ON hr.sender_id = p.id 
    WHERE p.id IS NULL
  LOOP
    RAISE NOTICE 'Invalid sender_id in hangout_requests: id=%, sender_id=%', r.id, r.sender_id;
  END LOOP;

  -- Check hangout_requests for invalid receiver_id
  FOR r IN 
    SELECT hr.id, hr.receiver_id 
    FROM hangout_requests hr 
    LEFT JOIN profiles p ON hr.receiver_id = p.id 
    WHERE p.id IS NULL
  LOOP
    RAISE NOTICE 'Invalid receiver_id in hangout_requests: id=%, receiver_id=%', r.id, r.receiver_id;
  END LOOP;

  -- Check availability for invalid user_id
  FOR r IN 
    SELECT a.id, a.user_id 
    FROM availability a 
    LEFT JOIN profiles p ON a.user_id = p.id 
    WHERE p.id IS NULL
  LOOP
    RAISE NOTICE 'Invalid user_id in availability: id=%, user_id=%', r.id, r.user_id;
  END LOOP;

  -- Check group_members for invalid user_id
  FOR r IN 
    SELECT gm.id, gm.user_id 
    FROM group_members gm 
    LEFT JOIN profiles p ON gm.user_id = p.id 
    WHERE p.id IS NULL
  LOOP
    RAISE NOTICE 'Invalid user_id in group_members: id=%, user_id=%', r.id, r.user_id;
  END LOOP;

  -- Check group_members for invalid group_id
  FOR r IN 
    SELECT gm.id, gm.group_id 
    FROM group_members gm 
    LEFT JOIN groups g ON gm.group_id = g.id 
    WHERE g.id IS NULL
  LOOP
    RAISE NOTICE 'Invalid group_id in group_members: id=%, group_id=%', r.id, r.group_id;
  END LOOP;
END $$;

-- Fix: Ensure all tables have proper RLS policies
-- Let's check current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('hangout_requests', 'availability', 'availability_shares', 'group_members')
ORDER BY tablename;

-- Check if there are any policies on these tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('hangout_requests', 'availability', 'availability_shares', 'group_members')
ORDER BY tablename, policyname;

