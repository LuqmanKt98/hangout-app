-- =====================================================
-- FIX HANGOUT REQUESTS DELETE POLICY
-- Allow receivers to delete accepted/rejected requests
-- =====================================================

-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Users can delete their sent requests" ON hangout_requests;
DROP POLICY IF EXISTS "Users can delete hangout requests" ON hangout_requests;

-- Create new policy that allows:
-- 1. Senders to delete any request they sent
-- 2. Receivers to delete accepted or rejected requests they received
CREATE POLICY "Users can delete their requests"
  ON hangout_requests FOR DELETE
  TO authenticated
  USING (
    auth.uid() = sender_id 
    OR (
      auth.uid() = receiver_id 
      AND status IN ('accepted', 'rejected')
    )
  );

-- Verify the policy was created
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'hangout_requests'
  AND cmd = 'DELETE'
ORDER BY policyname;

