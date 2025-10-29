-- Fix availability RLS policy to support availability_shares table
-- This allows users to share availability with specific friends

-- Drop the existing select policy
DROP POLICY IF EXISTS "Users can view availability based on visibility" ON public.availability;

-- Create new policy that includes availability_shares
CREATE POLICY "Users can view availability based on visibility and shares"
  ON public.availability
  FOR SELECT
  USING (
    -- Users can always see their own availability
    auth.uid() = user_id
    OR
    -- Everyone can see availability marked as 'everyone'
    visible_to = 'everyone'
    OR
    -- Friends can see availability marked as 'friends' if they are friends
    (
      visible_to = 'friends'
      AND EXISTS (
        SELECT 1 FROM public.friendships
        WHERE (
          (friendships.user_id = availability.user_id AND friendships.friend_id = auth.uid() AND friendships.status = 'accepted')
          OR
          (friendships.friend_id = availability.user_id AND friendships.user_id = auth.uid() AND friendships.status = 'accepted')
        )
      )
    )
    OR
    -- Users can see availability explicitly shared with them via availability_shares
    EXISTS (
      SELECT 1 FROM public.availability_shares
      WHERE availability_shares.availability_id = availability.id
      AND availability_shares.shared_with_user_id = auth.uid()
    )
  );
