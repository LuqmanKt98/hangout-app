-- Fix infinite recursion in group_members RLS policies
-- This script completely resets the policies to avoid conflicts

-- Step 1: Drop ALL existing policies on group_members
DO $$ 
BEGIN
    -- Drop all policies on group_members table
    DROP POLICY IF EXISTS "Users can view members of groups they belong to" ON group_members;
    DROP POLICY IF EXISTS "Group owners can add members" ON group_members;
    DROP POLICY IF EXISTS "Group owners and members themselves can remove members" ON group_members;
    DROP POLICY IF EXISTS "Users can view group members" ON group_members;
    DROP POLICY IF EXISTS "Group owners can add friends as members" ON group_members;
    DROP POLICY IF EXISTS "Group owners can update members" ON group_members;
    DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
END $$;

-- Step 2: Add the missing status column if it doesn't exist
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active'));

-- Update existing members to have 'active' status
UPDATE group_members SET status = 'active' WHERE status IS NULL;

-- Step 3: Create fixed policies that avoid recursion

-- Users can view group members (checks groups table first to avoid recursion)
CREATE POLICY "Users can view group members"
ON group_members FOR SELECT
TO authenticated
USING (
  -- Can see yourself
  user_id = auth.uid()
  -- Or if you're the group owner (checks groups table, not group_members)
  OR EXISTS (
    SELECT 1 FROM groups
    WHERE id = group_members.group_id
    AND owner_id = auth.uid()
  )
);

-- Group owners can add friends as members
CREATE POLICY "Group owners can add friends as members"
ON group_members FOR INSERT
TO authenticated
WITH CHECK (
  -- Must be the group owner
  EXISTS (
    SELECT 1 FROM groups
    WHERE id = group_members.group_id
    AND owner_id = auth.uid()
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
);

-- Users can leave groups, owners can remove members
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_members_user_status ON group_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_group_members_group_status ON group_members(group_id, status);
