-- =====================================================
-- FIX RLS POLICIES - Make them more permissive for authenticated users
-- This script fixes overly restrictive RLS policies
-- =====================================================

-- Drop ALL existing policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Drop ALL existing policies for groups
DROP POLICY IF EXISTS "Users can view their groups" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;
DROP POLICY IF EXISTS "Users can update their groups" ON groups;
DROP POLICY IF EXISTS "Users can delete their groups" ON groups;

-- Drop ALL existing policies for group_members
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Users can view group members of their groups" ON group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON group_members;
DROP POLICY IF EXISTS "Group creators and users can remove members" ON group_members;

-- =====================================================
-- PROFILES - Allow all authenticated users to view all profiles
-- =====================================================
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Keep update and insert policies
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- GROUPS - Allow viewing groups you're a member of
-- =====================================================
CREATE POLICY "Users can view their groups"
  ON groups FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = groups.id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their groups"
  ON groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their groups"
  ON groups FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- =====================================================
-- GROUP MEMBERS - Simplified policies
-- =====================================================
CREATE POLICY "Users can view group members of their groups"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    -- User is a member of the group
    user_id = auth.uid()
    OR
    -- User is the owner of the group
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id
      AND g.created_by = auth.uid()
    )
    OR
    -- User is a member of the same group
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
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
-- FRIENDSHIPS - Drop all existing policies first
-- =====================================================
DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete their friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update friendships" ON friendships;

CREATE POLICY "Users can view their friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- =====================================================
-- FRIEND REQUESTS - Drop all existing policies first
-- =====================================================
DROP POLICY IF EXISTS "Users can view their friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can create friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can update received requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can delete their sent requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can update friend requests" ON friend_requests;

CREATE POLICY "Users can view their friend requests"
  ON friend_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friend requests"
  ON friend_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received requests"
  ON friend_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

CREATE POLICY "Users can delete their sent requests"
  ON friend_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- =====================================================
-- AVAILABILITY - Drop all existing policies first
-- =====================================================
DROP POLICY IF EXISTS "Users can view shared availability" ON availability;
DROP POLICY IF EXISTS "Users can create their availability" ON availability;
DROP POLICY IF EXISTS "Users can update their availability" ON availability;
DROP POLICY IF EXISTS "Users can delete their availability" ON availability;
DROP POLICY IF EXISTS "Users can view availability" ON availability;

CREATE POLICY "Users can view shared availability"
  ON availability FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
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
-- AVAILABILITY SHARES - Drop all existing policies first
-- =====================================================
DROP POLICY IF EXISTS "Users can view their availability shares" ON availability_shares;
DROP POLICY IF EXISTS "Users can create shares for their availability" ON availability_shares;
DROP POLICY IF EXISTS "Users can delete their availability shares" ON availability_shares;
DROP POLICY IF EXISTS "Users can view availability shares" ON availability_shares;
DROP POLICY IF EXISTS "Users can update availability shares" ON availability_shares;

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
-- HANGOUT REQUESTS - Drop all existing policies first
-- =====================================================
DROP POLICY IF EXISTS "Users can view their hangout requests" ON hangout_requests;
DROP POLICY IF EXISTS "Users can create hangout requests to friends only" ON hangout_requests;
DROP POLICY IF EXISTS "Users can create hangout requests" ON hangout_requests;
DROP POLICY IF EXISTS "Users can update their hangout requests" ON hangout_requests;
DROP POLICY IF EXISTS "Users can delete their sent requests" ON hangout_requests;
DROP POLICY IF EXISTS "Users can delete hangout requests" ON hangout_requests;

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

