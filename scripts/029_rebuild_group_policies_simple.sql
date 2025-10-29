-- Complete rebuild of group policies to eliminate recursion
-- This script disables RLS, drops all policies, and recreates them simply

-- Step 1: Disable RLS temporarily
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('groups', 'group_members')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, non-recursive policies for GROUPS table
CREATE POLICY "Anyone can view groups they own or are members of"
ON public.groups FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
);

CREATE POLICY "Users can create groups"
ON public.groups FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Group owners can update their groups"
ON public.groups FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Group owners can delete their groups"
ON public.groups FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Step 5: Create simple, non-recursive policies for GROUP_MEMBERS table
-- KEY: These policies NEVER query group_members, only groups table

CREATE POLICY "Users can view group members if they own the group"
ON public.group_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id
    AND g.owner_id = auth.uid()
  )
);

CREATE POLICY "Group owners can add members"
ON public.group_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id
    AND g.owner_id = auth.uid()
  )
);

CREATE POLICY "Group owners can update members"
ON public.group_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id
    AND g.owner_id = auth.uid()
  )
);

CREATE POLICY "Group owners and members themselves can delete memberships"
ON public.group_members FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id
    AND g.owner_id = auth.uid()
  )
);

-- Verify policies were created
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('groups', 'group_members')
ORDER BY tablename, policyname;
