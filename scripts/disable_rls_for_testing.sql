-- =====================================================
-- DISABLE RLS FOR TESTING (TEMPORARY - NOT FOR PRODUCTION!)
-- This script temporarily disables RLS to test if that's the issue
-- =====================================================

-- WARNING: This makes your database insecure!
-- Only use this for local testing to confirm RLS is the issue
-- After confirming, re-enable RLS and use fix_rls_policies.sql instead

-- Disable RLS on all tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE friendships DISABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE availability_shares DISABLE ROW LEVEL SECURITY;
ALTER TABLE hangout_requests DISABLE ROW LEVEL SECURITY;

-- To re-enable RLS later, run:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE availability_shares ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE hangout_requests ENABLE ROW LEVEL SECURITY;

