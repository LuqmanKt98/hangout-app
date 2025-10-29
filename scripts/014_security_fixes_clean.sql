-- Complete security overhaul - drops all existing policies and creates new secure ones
-- Run this script to fix all security issues

-- ============================================================================
-- STEP 1: Drop ALL existing policies on all tables
-- ============================================================================

-- Drop all policies on profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view friends profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view accepted friends profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Drop all policies on friendships
DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete own friendships" ON friendships;

-- Drop all policies on availability
DROP POLICY IF EXISTS "Users can view own availability" ON availability;
DROP POLICY IF EXISTS "Users can view friends availability" ON availability;
DROP POLICY IF EXISTS "Users can create own availability" ON availability;
DROP POLICY IF EXISTS "Users can update own availability" ON availability;
DROP POLICY IF EXISTS "Users can delete own availability" ON availability;

-- Drop all policies on hangout_requests
DROP POLICY IF EXISTS "Users can view own hangout requests" ON hangout_requests;
DROP POLICY IF EXISTS "Users can create hangout requests" ON hangout_requests;
DROP POLICY IF EXISTS "Users can update own hangout requests" ON hangout_requests;

-- Drop all policies on message_threads
DROP POLICY IF EXISTS "Users can view own message threads" ON message_threads;
DROP POLICY IF EXISTS "Users can create message threads" ON message_threads;
DROP POLICY IF EXISTS "Users can update own message threads" ON message_threads;

-- Drop all policies on messages
DROP POLICY IF EXISTS "Users can view messages in their threads" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their threads" ON messages;

-- Drop all policies on shared_availability
DROP POLICY IF EXISTS "Anyone can view shared availability" ON shared_availability;
DROP POLICY IF EXISTS "Authenticated users can view shared availability" ON shared_availability;
DROP POLICY IF EXISTS "Users can create shared availability" ON shared_availability;
DROP POLICY IF EXISTS "Users can update own shared availability" ON shared_availability;
DROP POLICY IF EXISTS "Users can delete own shared availability" ON shared_availability;

-- Drop all policies on groups
DROP POLICY IF EXISTS "Users can view own groups" ON groups;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;
DROP POLICY IF EXISTS "Group owners can update groups" ON groups;
DROP POLICY IF EXISTS "Group owners can delete groups" ON groups;

-- Drop all policies on group_members
DROP POLICY IF EXISTS "Users can view own group memberships" ON group_members;
DROP POLICY IF EXISTS "Users can view members of their groups" ON group_members;
DROP POLICY IF EXISTS "Group owners can add members" ON group_members;
DROP POLICY IF EXISTS "Group owners can update members" ON group_members;
DROP POLICY IF EXISTS "Group owners can remove members" ON group_members;
DROP POLICY IF EXISTS "Users can remove themselves from groups" ON group_members;

-- ============================================================================
-- STEP 2: Create new secure policies
-- ============================================================================

-- PROFILES TABLE - Restrict access to own profile and accepted friends only
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view accepted friends profiles"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT user_id FROM friendships 
      WHERE friend_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT friend_id FROM friendships 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- FRIENDSHIPS TABLE - Users can only manage their own friendships
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own friendships"
  ON friendships FOR UPDATE
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- AVAILABILITY TABLE - Only show active availability to friends
CREATE POLICY "Users can view own availability"
  ON availability FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view friends active availability"
  ON availability FOR SELECT
  USING (
    is_active = true AND
    user_id IN (
      SELECT user_id FROM friendships 
      WHERE friend_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT friend_id FROM friendships 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can create own availability"
  ON availability FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own availability"
  ON availability FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own availability"
  ON availability FOR DELETE
  USING (user_id = auth.uid());

-- HANGOUT_REQUESTS TABLE - Users can only see requests they're involved in
CREATE POLICY "Users can view own hangout requests"
  ON hangout_requests FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can create hangout requests to friends"
  ON hangout_requests FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    recipient_id IN (
      SELECT user_id FROM friendships 
      WHERE friend_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT friend_id FROM friendships 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can update own hangout requests"
  ON hangout_requests FOR UPDATE
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- MESSAGE_THREADS TABLE - Users can only see threads they're part of
CREATE POLICY "Users can view own message threads"
  ON message_threads FOR SELECT
  USING (
    hangout_request_id IN (
      SELECT id FROM hangout_requests 
      WHERE sender_id = auth.uid() OR recipient_id = auth.uid()
    )
  );

CREATE POLICY "Users can create message threads"
  ON message_threads FOR INSERT
  WITH CHECK (
    hangout_request_id IN (
      SELECT id FROM hangout_requests 
      WHERE sender_id = auth.uid() OR recipient_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own message threads"
  ON message_threads FOR UPDATE
  USING (
    hangout_request_id IN (
      SELECT id FROM hangout_requests 
      WHERE sender_id = auth.uid() OR recipient_id = auth.uid()
    )
  );

-- MESSAGES TABLE - Users can only see messages in their threads
CREATE POLICY "Users can view messages in their threads"
  ON messages FOR SELECT
  USING (
    thread_id IN (
      SELECT id FROM message_threads 
      WHERE hangout_request_id IN (
        SELECT id FROM hangout_requests 
        WHERE sender_id = auth.uid() OR recipient_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create messages in their threads"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    thread_id IN (
      SELECT id FROM message_threads 
      WHERE hangout_request_id IN (
        SELECT id FROM hangout_requests 
        WHERE sender_id = auth.uid() OR recipient_id = auth.uid()
      )
    )
  );

-- SHARED_AVAILABILITY TABLE - Require authentication
CREATE POLICY "Authenticated users can view shared availability"
  ON shared_availability FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create shared availability"
  ON shared_availability FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own shared availability"
  ON shared_availability FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own shared availability"
  ON shared_availability FOR DELETE
  USING (user_id = auth.uid());

-- GROUPS TABLE - Users can view groups they own or are members of
CREATE POLICY "Users can view own groups"
  ON groups FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view groups they are members of"
  ON groups FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND status = 'accepted'
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

-- GROUP_MEMBERS TABLE - Restrict to friends only
CREATE POLICY "Users can view own group memberships"
  ON group_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view members of their groups"
  ON group_members FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM groups WHERE owner_id = auth.uid()
      UNION
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Group owners can add friends as members"
  ON group_members FOR INSERT
  WITH CHECK (
    group_id IN (SELECT id FROM groups WHERE owner_id = auth.uid()) AND
    user_id IN (
      SELECT user_id FROM friendships 
      WHERE friend_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT friend_id FROM friendships 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Group owners can update member status"
  ON group_members FOR UPDATE
  USING (group_id IN (SELECT id FROM groups WHERE owner_id = auth.uid()));

CREATE POLICY "Group owners can remove members"
  ON group_members FOR DELETE
  USING (group_id IN (SELECT id FROM groups WHERE owner_id = auth.uid()));

CREATE POLICY "Users can remove themselves from groups"
  ON group_members FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- STEP 3: Add performance indexes for security queries
-- ============================================================================

-- Indexes for friendship lookups (used in many policies)
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status ON friendships(friend_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_both_users ON friendships(user_id, friend_id);

-- Indexes for availability lookups
CREATE INDEX IF NOT EXISTS idx_availability_user_active ON availability(user_id, is_active);

-- Indexes for hangout requests
CREATE INDEX IF NOT EXISTS idx_hangout_requests_sender ON hangout_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_hangout_requests_recipient ON hangout_requests(recipient_id);

-- Indexes for groups
CREATE INDEX IF NOT EXISTS idx_groups_owner ON groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);

-- ============================================================================
-- STEP 4: Create audit log table (optional but recommended)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs (you can adjust this)
CREATE POLICY "Service role can view audit logs"
  ON audit_log FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name, created_at DESC);
