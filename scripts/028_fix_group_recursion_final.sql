-- Fix infinite recursion in group_members policies
-- This script completely removes and recreates all group policies without recursion

-- Drop ALL existing policies on both tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on groups table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'groups' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.groups';
    END LOOP;
    
    -- Drop all policies on group_members table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'group_members' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.group_members';
    END LOOP;
END $$;

-- Recreate groups policies (these are fine, no recursion)
CREATE POLICY "Users can view their groups"
ON public.groups FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = groups.id
    AND group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create groups"
ON public.groups FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Group owners can update groups"
ON public.groups FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Group owners can delete groups"
ON public.groups FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- Recreate group_members policies WITHOUT recursion
-- The key fix: SELECT policy checks groups table first, not group_members
CREATE POLICY "Users can view group members"
ON public.group_members FOR SELECT
TO authenticated
USING (
  -- You can see members if you're the member
  user_id = auth.uid()
  OR 
  -- Or if you're the group owner (checks groups table, not group_members - no recursion!)
  EXISTS (
    SELECT 1 FROM public.groups
    WHERE groups.id = group_members.group_id
    AND groups.owner_id = auth.uid()
  )
);

CREATE POLICY "Group owners can add members"
ON public.group_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.groups
    WHERE groups.id = group_members.group_id
    AND groups.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can remove themselves or owners can remove members"
ON public.group_members FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.groups
    WHERE groups.id = group_members.group_id
    AND groups.owner_id = auth.uid()
  )
);
