-- =====================================================
-- FIX GROUPS TABLE SCHEMA
-- Rename created_by to owner_id and add missing columns to group_members
-- =====================================================

-- First, drop all policies on groups and group_members
DROP POLICY IF EXISTS "Users can view their groups" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;
DROP POLICY IF EXISTS "Users can update their groups" ON groups;
DROP POLICY IF EXISTS "Users can delete their groups" ON groups;
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON group_members;
DROP POLICY IF EXISTS "Group creators can remove members" ON group_members;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;
DROP POLICY IF EXISTS "Group owners can update their groups" ON groups;
DROP POLICY IF EXISTS "Group owners can delete their groups" ON groups;
DROP POLICY IF EXISTS "Users can view members of groups they belong to" ON group_members;
DROP POLICY IF EXISTS "Group owners can add members" ON group_members;
DROP POLICY IF EXISTS "Group owners and members themselves can remove members" ON group_members;

-- Rename created_by to owner_id in groups table
ALTER TABLE groups RENAME COLUMN created_by TO owner_id;

-- Add missing columns to group_members if they don't exist
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member'));
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active'));

-- Recreate RLS policies for groups
CREATE POLICY "Users can view their groups"
  ON groups FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their groups"
  ON groups FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their groups"
  ON groups FOR DELETE
  USING (auth.uid() = owner_id);

-- Recreate RLS policies for group_members
CREATE POLICY "Users can view group members"
  ON group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND (groups.owner_id = auth.uid() OR group_members.user_id = auth.uid())
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

CREATE POLICY "Group owners can remove members"
  ON group_members FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.owner_id = auth.uid()
    )
  );

