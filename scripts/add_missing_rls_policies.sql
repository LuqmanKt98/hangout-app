-- =====================================================
-- ADD MISSING RLS POLICIES FOR TABLES WITH 500 ERRORS
-- Run this if you're getting 500 errors on specific tables
-- =====================================================

-- Enable RLS on all tables (in case it's not enabled)
ALTER TABLE hangout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their hangout requests" ON hangout_requests;
DROP POLICY IF EXISTS "Users can create hangout requests" ON hangout_requests;
DROP POLICY IF EXISTS "Users can update their hangout requests" ON hangout_requests;
DROP POLICY IF EXISTS "Users can delete their sent requests" ON hangout_requests;

DROP POLICY IF EXISTS "Users can view shared availability" ON availability;
DROP POLICY IF EXISTS "Users can view availability" ON availability;
DROP POLICY IF EXISTS "Users can create their availability" ON availability;
DROP POLICY IF EXISTS "Users can update their availability" ON availability;
DROP POLICY IF EXISTS "Users can delete their availability" ON availability;

DROP POLICY IF EXISTS "Users can view their availability shares" ON availability_shares;
DROP POLICY IF EXISTS "Users can view availability shares" ON availability_shares;
DROP POLICY IF EXISTS "Users can create shares for their availability" ON availability_shares;
DROP POLICY IF EXISTS "Users can delete their availability shares" ON availability_shares;

DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Users can view group members of their groups" ON group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON group_members;
DROP POLICY IF EXISTS "Group creators and users can remove members" ON group_members;

-- =====================================================
-- HANGOUT REQUESTS POLICIES
-- =====================================================
CREATE POLICY "Users can view their hangout requests"
  ON hangout_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create hangout requests"
  ON hangout_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their hangout requests"
  ON hangout_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can delete their sent requests"
  ON hangout_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- =====================================================
-- AVAILABILITY POLICIES
-- =====================================================
CREATE POLICY "Users can view availability"
  ON availability FOR SELECT
  TO authenticated
  USING (
    -- User can view their own availability
    auth.uid() = user_id
    OR
    -- User can view shared availability
    (is_active = true AND (
      EXISTS (
        SELECT 1 FROM availability_shares avs
        WHERE avs.availability_id = availability.id
        AND avs.shared_with_user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM availability_shares avs
        JOIN group_members gm ON avs.shared_with_group_id = gm.group_id
        WHERE avs.availability_id = availability.id
        AND gm.user_id = auth.uid()
      )
    ))
  );

CREATE POLICY "Users can create their availability"
  ON availability FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their availability"
  ON availability FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their availability"
  ON availability FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- AVAILABILITY SHARES POLICIES
-- =====================================================
CREATE POLICY "Users can view their availability shares"
  ON availability_shares FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM availability av
      WHERE av.id = availability_shares.availability_id
      AND av.user_id = auth.uid()
    ) OR
    shared_with_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = availability_shares.shared_with_group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shares for their availability"
  ON availability_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM availability av
      WHERE av.id = availability_shares.availability_id
      AND av.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their availability shares"
  ON availability_shares FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM availability av
      WHERE av.id = availability_shares.availability_id
      AND av.user_id = auth.uid()
    )
  );

-- =====================================================
-- GROUP MEMBERS POLICIES (Simplified to avoid recursion)
-- =====================================================
CREATE POLICY "Users can view group members of their groups"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    -- User is viewing their own membership
    user_id = auth.uid()
    OR
    -- User is the owner of the group
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id
      AND g.created_by = auth.uid()
    )
    OR
    -- User is a member of the same group (simplified check)
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Group creators can add members"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id
      AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "Group creators and users can remove members"
  ON group_members FOR DELETE
  TO authenticated
  USING (
    -- User can remove themselves
    user_id = auth.uid()
    OR
    -- Group owner can remove anyone
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id
      AND g.created_by = auth.uid()
    )
  );

-- =====================================================
-- VERIFY POLICIES WERE CREATED
-- =====================================================
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('hangout_requests', 'availability', 'availability_shares', 'group_members')
ORDER BY tablename, policyname;

