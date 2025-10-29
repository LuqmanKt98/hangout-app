-- Security Fixes - Comprehensive RLS Policy Updates
-- This script fixes critical privacy and security issues

-- ============================================
-- PROFILES TABLE - Fix Privacy Violation
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view friends profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create new restrictive policies
-- Users can only view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can view profiles of accepted friends
CREATE POLICY "Users can view friends profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND (
        (user_id = auth.uid() AND friend_id = profiles.id)
        OR (friend_id = auth.uid() AND user_id = profiles.id)
      )
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (for trigger)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- AVAILABILITY TABLE - Add Active Status Check
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own availability" ON availability;
DROP POLICY IF EXISTS "Users can view friends availability" ON availability;
DROP POLICY IF EXISTS "Users can insert own availability" ON availability;
DROP POLICY IF EXISTS "Users can update own availability" ON availability;
DROP POLICY IF EXISTS "Users can delete own availability" ON availability;

-- Recreate with is_active check
CREATE POLICY "Users can view own availability"
  ON availability FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view friends availability"
  ON availability FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND (
        (user_id = auth.uid() AND friend_id = availability.user_id)
        OR (friend_id = auth.uid() AND user_id = availability.user_id)
      )
    )
  );

CREATE POLICY "Users can insert own availability"
  ON availability FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own availability"
  ON availability FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own availability"
  ON availability FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- SHARED AVAILABILITY - Require Authentication
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view shared availability" ON shared_availability;
DROP POLICY IF EXISTS "Authenticated users can view shared availability" ON shared_availability;
DROP POLICY IF EXISTS "Users can create shared links" ON shared_availability;
DROP POLICY IF EXISTS "Users can delete own shared links" ON shared_availability;

-- Require authentication for viewing shared links
CREATE POLICY "Authenticated users can view shared availability"
  ON shared_availability FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create shared links"
  ON shared_availability FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own shared links"
  ON shared_availability FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- GROUPS - Add Member Status and Friend Check
-- ============================================

-- Add status column to group_members if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'group_members' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE group_members 
    ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'declined'));
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own groups" ON groups;
DROP POLICY IF EXISTS "Users can view groups they are in" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;
DROP POLICY IF EXISTS "Group owners can update groups" ON groups;
DROP POLICY IF EXISTS "Group owners can delete groups" ON groups;

-- Recreate group policies
CREATE POLICY "Users can view own groups"
  ON groups FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view groups they are in"
  ON groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = groups.id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Group owners can update groups"
  ON groups FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Group owners can delete groups"
  ON groups FOR DELETE
  USING (owner_id = auth.uid());

-- Drop existing group_members policies
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Group owners can add members" ON group_members;
DROP POLICY IF EXISTS "Group owners can remove members" ON group_members;
DROP POLICY IF EXISTS "Users can remove themselves" ON group_members;

-- Recreate group_members policies
CREATE POLICY "Users can view group members"
  ON group_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND (
        groups.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM group_members gm2
          WHERE gm2.group_id = groups.id
          AND gm2.user_id = auth.uid()
          AND gm2.status = 'active'
        )
      )
    )
  );

CREATE POLICY "Group owners can add members"
  ON group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.owner_id = auth.uid()
    )
  );

CREATE POLICY "Group owners can update members"
  ON group_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.owner_id = auth.uid()
    )
  );

CREATE POLICY "Group owners can remove members"
  ON group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove themselves"
  ON group_members FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- PERFORMANCE INDEXES FOR SECURITY QUERIES
-- ============================================

-- Index for friendship lookups (used in multiple policies)
CREATE INDEX IF NOT EXISTS idx_friendships_user_friend_status 
  ON friendships(user_id, friend_id, status);

CREATE INDEX IF NOT EXISTS idx_friendships_friend_user_status 
  ON friendships(friend_id, user_id, status);

-- Index for availability active status
CREATE INDEX IF NOT EXISTS idx_availability_user_active 
  ON availability(user_id, is_active);

-- Index for group member lookups
CREATE INDEX IF NOT EXISTS idx_group_members_group_user_status 
  ON group_members(group_id, user_id, status);

-- Index for group owner lookups
CREATE INDEX IF NOT EXISTS idx_groups_owner 
  ON groups(owner_id);

-- ============================================
-- AUDIT LOG (Optional but Recommended)
-- ============================================

-- Create audit log table for sensitive operations
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow inserts, no reads or updates
CREATE POLICY "System can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_created 
  ON audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_created 
  ON audit_log(table_name, created_at DESC);
