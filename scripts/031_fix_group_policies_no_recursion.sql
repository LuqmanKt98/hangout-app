-- Complete fix for group policies - absolutely no recursion possible
-- This script uses the simplest possible logic

BEGIN;

-- Step 1: Disable RLS temporarily
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all group_members policies
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'group_members' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.group_members', r.policyname);
    END LOOP;
    
    -- Drop all groups policies
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'groups' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.groups', r.policyname);
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Step 4: Create GROUPS policies (these are safe, no recursion possible)
CREATE POLICY "users_insert_groups"
ON public.groups FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "users_select_own_groups"
ON public.groups FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "users_update_own_groups"
ON public.groups FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "users_delete_own_groups"
ON public.groups FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Step 5: Create GROUP_MEMBERS policies with ZERO recursion
-- Key: These policies NEVER query group_members table, only groups table

-- INSERT: Only group owner can add members
CREATE POLICY "owner_insert_members"
ON public.group_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id
    AND g.owner_id = auth.uid()
  )
);

-- SELECT: Can view if you're the group owner OR if it's your own membership record
CREATE POLICY "view_members_simple"
ON public.group_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id
    AND g.owner_id = auth.uid()
  )
);

-- UPDATE: Only group owner can update
CREATE POLICY "owner_update_members"
ON public.group_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id
    AND g.owner_id = auth.uid()
  )
);

-- DELETE: Group owner or the member themselves can delete
CREATE POLICY "owner_or_self_delete_members"
ON public.group_members FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id
    AND g.owner_id = auth.uid()
  )
);

COMMIT;

-- Verify policies were created
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('groups', 'group_members')
ORDER BY tablename, cmd, policyname;
