-- Fix infinite recursion in group_members RLS policies
-- The issue: SELECT policy queries group_members to check if you can SELECT from group_members

-- First, add the missing status column if it doesn't exist
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active'));

-- Update existing members to have 'active' status
UPDATE group_members SET status = 'active' WHERE status IS NULL;

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Users can view members of groups they belong to" ON group_members;
DROP POLICY IF EXISTS "Group owners can add members" ON group_members;
DROP POLICY IF EXISTS "Group owners and members themselves can remove members" ON group_members;

-- Create fixed policies that avoid recursion

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
  -- Or if you're an active member of the same group
  OR EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
    AND gm.status = 'active'
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
  -- And the new member must be your friend
  AND (
    user_id = auth.uid() -- Adding yourself as owner
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND (
        (user_id = auth.uid() AND friend_id = group_members.user_id)
        OR (friend_id = auth.uid() AND user_id = group_members.user_id)
      )
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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_group_members_user_status ON group_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_group_members_group_status ON group_members(group_id, status);
