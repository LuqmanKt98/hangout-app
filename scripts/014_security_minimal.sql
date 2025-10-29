-- Minimal Security Fixes for Avale MVP
-- This script updates only the critical security policies without creating new tables

-- ============================================================================
-- 1. FIX PROFILES TABLE - CRITICAL PRIVACY ISSUE
-- ============================================================================

-- Drop all existing policies on profiles
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;

-- Create new secure policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view friends profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE ((user_id = auth.uid() AND friend_id = profiles.id)
         OR (friend_id = auth.uid() AND user_id = profiles.id))
        AND status = 'accepted'
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- 2. FIX AVAILABILITY TABLE - ADD ACTIVE STATUS CHECK
-- ============================================================================

-- Drop all existing policies on availability
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'availability') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON availability';
    END LOOP;
END $$;

-- Create new secure policies for availability
CREATE POLICY "Users can view own availability"
  ON availability FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Friends can view active availability"
  ON availability FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE ((user_id = auth.uid() AND friend_id = availability.user_id)
         OR (friend_id = auth.uid() AND user_id = availability.user_id))
        AND status = 'accepted'
    )
  );

CREATE POLICY "Users can manage own availability"
  ON availability FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- 3. FIX SHARED AVAILABILITY - REQUIRE AUTHENTICATION
-- ============================================================================

-- Drop all existing policies on shared_availability
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'shared_availability') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON shared_availability';
    END LOOP;
END $$;

-- Create new secure policies for shared_availability
CREATE POLICY "Authenticated users can view shared links"
  ON shared_availability FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage own shared links"
  ON shared_availability FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- 4. ADD PERFORMANCE INDEXES
-- ============================================================================

-- Add indexes for security-related queries (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status ON friendships(friend_id, status);
CREATE INDEX IF NOT EXISTS idx_availability_user_active ON availability(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- ============================================================================
-- SECURITY FIXES COMPLETE
-- ============================================================================

-- Summary of changes:
-- 1. ✅ Profiles: Users can only see their own profile and accepted friends
-- 2. ✅ Availability: Only active availability is visible to friends
-- 3. ✅ Shared links: Now require authentication
-- 4. ✅ Added performance indexes for security queries
