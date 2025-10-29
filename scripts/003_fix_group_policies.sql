-- Fix circular dependency in group and group_members RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their groups" ON groups;
DROP POLICY IF EXISTS "Users can view group members" ON group_members;

-- Recreate groups policy (simplified - no recursion)
CREATE POLICY "Users can view their groups"
  ON groups FOR SELECT
  USING (auth.uid() = created_by);

-- Recreate group_members policy (simplified - no recursion)
CREATE POLICY "Users can view group members"
  ON group_members FOR SELECT
  USING (
    -- Can view if they're a member of the group
    user_id = auth.uid() OR
    -- Can view if they created the group
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  );

-- Add a new policy to allow users to see groups they're members of
CREATE POLICY "Users can view groups they are members of"
  ON groups FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );
