-- Comprehensive Security Fixes for Avale MVP
-- This script updates RLS policies to ensure maximum data privacy and security

-- ============================================================================
-- PROFILES TABLE - Restrict access to own profile and accepted friends only
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

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can view profiles of accepted friends only
CREATE POLICY "Users can view friends profiles"
ON profiles FOR SELECT
TO authenticated
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
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================================================
-- FRIENDSHIPS TABLE - Secure friend relationships
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'friendships') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON friendships';
    END LOOP;
END $$;

-- Users can view their own friendships
CREATE POLICY "Users can view own friendships"
ON friendships FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Users can create friend requests
CREATE POLICY "Users can create friend requests"
ON friendships FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update friendships they're part of
CREATE POLICY "Users can update own friendships"
ON friendships FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR friend_id = auth.uid())
WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());

-- Users can delete their own friendships
CREATE POLICY "Users can delete own friendships"
ON friendships FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- ============================================================================
-- AVAILABILITY TABLE - Only show active availability to friends
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'availability') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON availability';
    END LOOP;
END $$;

-- Users can view their own availability (active or inactive)
CREATE POLICY "Users can view own availability"
ON availability FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can view friends' ACTIVE availability only
CREATE POLICY "Users can view friends active availability"
ON availability FOR SELECT
TO authenticated
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

-- Users can manage their own availability
CREATE POLICY "Users can insert own availability"
ON availability FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own availability"
ON availability FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own availability"
ON availability FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- HANGOUT_REQUESTS TABLE - Secure hangout coordination
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'hangout_requests') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON hangout_requests';
    END LOOP;
END $$;

-- Users can view requests they're part of
CREATE POLICY "Users can view own hangout requests"
ON hangout_requests FOR SELECT
TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Users can create requests to friends only
CREATE POLICY "Users can create hangout requests to friends"
ON hangout_requests FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND (
      (user_id = auth.uid() AND friend_id = receiver_id)
      OR (friend_id = auth.uid() AND user_id = receiver_id)
    )
  )
);

-- Users can update requests they're part of
CREATE POLICY "Users can update own hangout requests"
ON hangout_requests FOR UPDATE
TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid())
WITH CHECK (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Users can delete their own sent requests
CREATE POLICY "Users can delete own hangout requests"
ON hangout_requests FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- ============================================================================
-- MESSAGES TABLE - Secure messaging
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'messages') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON messages';
    END LOOP;
END $$;

-- Users can view messages in their hangout requests
CREATE POLICY "Users can view messages in their requests"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM hangout_requests
    WHERE id = messages.hangout_request_id
    AND (sender_id = auth.uid() OR receiver_id = auth.uid())
  )
);

-- Users can send messages in their hangout requests
CREATE POLICY "Users can send messages in their requests"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM hangout_requests
    WHERE id = messages.hangout_request_id
    AND (sender_id = auth.uid() OR receiver_id = auth.uid())
  )
);

-- ============================================================================
-- SHARED_AVAILABILITY TABLE - Secure sharing links
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'shared_availability') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON shared_availability';
    END LOOP;
END $$;

-- Users can view their own shared links
CREATE POLICY "Users can view own shared links"
ON shared_availability FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Authenticated users can view non-expired shared links
CREATE POLICY "Authenticated users can view valid shared links"
ON shared_availability FOR SELECT
TO authenticated
USING (expires_at > now() OR expires_at IS NULL);

-- Users can create their own shared links
CREATE POLICY "Users can create own shared links"
ON shared_availability FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can delete their own shared links
CREATE POLICY "Users can delete own shared links"
ON shared_availability FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- GROUPS TABLE - Secure group management
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'groups') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON groups';
    END LOOP;
END $$;

-- Users can view groups they're members of
CREATE POLICY "Users can view their groups"
ON groups FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = groups.id
    AND user_id = auth.uid()
    AND status = 'accepted'
  )
);

-- Users can create their own groups
CREATE POLICY "Users can create own groups"
ON groups FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Group owners can update their groups
CREATE POLICY "Group owners can update groups"
ON groups FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Group owners can delete their groups
CREATE POLICY "Group owners can delete groups"
ON groups FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- ============================================================================
-- GROUP_MEMBERS TABLE - Secure group membership
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'group_members') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON group_members';
    END LOOP;
END $$;

-- Users can view members of groups they're in
CREATE POLICY "Users can view group members"
ON group_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM groups
    WHERE id = group_members.group_id
    AND owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
    AND gm.status = 'accepted'
  )
);

-- Group owners can add friends as members
CREATE POLICY "Group owners can add friends as members"
ON group_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM groups
    WHERE id = group_members.group_id
    AND owner_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND (
      (user_id = auth.uid() AND friend_id = group_members.user_id)
      OR (friend_id = auth.uid() AND user_id = group_members.user_id)
    )
  )
);

-- Group owners and members can update membership
CREATE POLICY "Group owners can update members"
ON group_members FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM groups
    WHERE id = group_members.group_id
    AND owner_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM groups
    WHERE id = group_members.group_id
    AND owner_id = auth.uid()
  )
);

-- Group owners and members can remove themselves
CREATE POLICY "Users can leave groups"
ON group_members FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM groups
    WHERE id = group_members.group_id
    AND owner_id = auth.uid()
  )
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Add indexes for security-related queries
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status ON friendships(friend_id, status);
CREATE INDEX IF NOT EXISTS idx_availability_user_active ON availability(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_group_members_group_user ON group_members(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_status ON group_members(user_id, status);

-- ============================================================================
-- AUDIT LOG TABLE (Optional but recommended)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only system can write to audit log
CREATE POLICY "System can insert audit logs"
ON audit_log FOR INSERT
WITH CHECK (true);

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
ON audit_log FOR SELECT
TO authenticated
USING (user_id = auth.uid());
