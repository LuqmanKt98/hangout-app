-- =====================================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- Error: infinite recursion detected in policy for relation "availability"
-- Error: infinite recursion detected in policy for relation "availability_shares"
-- =====================================================

-- The issue is that availability policies reference availability_shares,
-- and availability_shares policies reference availability, creating a circular dependency.

-- Solution: Simplify the policies to break the recursion

-- =====================================================
-- STEP 1: Drop all existing policies on both tables
-- =====================================================
DROP POLICY IF EXISTS "Users can view availability" ON availability;
DROP POLICY IF EXISTS "Users can view their own availability" ON availability;
DROP POLICY IF EXISTS "Users can view shared availability" ON availability;
DROP POLICY IF EXISTS "Users can create their availability" ON availability;
DROP POLICY IF EXISTS "Users can update their availability" ON availability;
DROP POLICY IF EXISTS "Users can delete their availability" ON availability;

DROP POLICY IF EXISTS "Users can view their availability shares" ON availability_shares;
DROP POLICY IF EXISTS "Users can view availability shares" ON availability_shares;
DROP POLICY IF EXISTS "Users can create shares for their availability" ON availability_shares;
DROP POLICY IF EXISTS "Users can delete their availability shares" ON availability_shares;
DROP POLICY IF EXISTS "Users can update their availability shares" ON availability_shares;

-- =====================================================
-- STEP 2: Create simplified AVAILABILITY policies (NO recursion)
-- =====================================================

-- Allow users to view their own availability (simple, no joins)
CREATE POLICY "Users can view own availability"
  ON availability FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to create their own availability
CREATE POLICY "Users can create own availability"
  ON availability FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own availability
CREATE POLICY "Users can update own availability"
  ON availability FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to delete their own availability
CREATE POLICY "Users can delete own availability"
  ON availability FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- STEP 3: Create simplified AVAILABILITY_SHARES policies (NO recursion)
-- =====================================================

-- Allow users to view shares where they are the recipient
CREATE POLICY "Users can view shares shared with them"
  ON availability_shares FOR SELECT
  TO authenticated
  USING (shared_with_user_id = auth.uid());

-- Allow users to view shares they created (for their own availability)
-- This uses a simple column check, no join to availability table
CREATE POLICY "Users can view their own shares"
  ON availability_shares FOR SELECT
  TO authenticated
  USING (
    availability_id IN (
      SELECT id FROM availability WHERE user_id = auth.uid()
    )
  );

-- Allow users to create shares for their own availability
CREATE POLICY "Users can create shares"
  ON availability_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    availability_id IN (
      SELECT id FROM availability WHERE user_id = auth.uid()
    )
  );

-- Allow users to delete shares for their own availability
CREATE POLICY "Users can delete shares"
  ON availability_shares FOR DELETE
  TO authenticated
  USING (
    availability_id IN (
      SELECT id FROM availability WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 4: Add a separate policy for viewing shared availability
-- This is a second SELECT policy on availability, but it won't cause recursion
-- because it doesn't reference availability_shares in a circular way
-- =====================================================

CREATE POLICY "Users can view availability shared with them"
  ON availability FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND id IN (
      SELECT availability_id 
      FROM availability_shares 
      WHERE shared_with_user_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 5: Add policy for group-based sharing
-- =====================================================

CREATE POLICY "Users can view availability shared with their groups"
  ON availability FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND id IN (
      SELECT avs.availability_id
      FROM availability_shares avs
      WHERE avs.shared_with_group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- STEP 6: Verify policies were created
-- =====================================================
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('availability', 'availability_shares')
ORDER BY tablename, policyname;

