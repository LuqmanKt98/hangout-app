-- Fix infinite recursion in availability RLS policies
-- This reverts to the original working policy that uses visible_to and friendships
-- instead of availability_shares which causes circular dependency

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view their own availability" ON public.availability;
DROP POLICY IF EXISTS "Users can view shared availability" ON public.availability;

-- Recreate the original working policy that uses visible_to and friendships
CREATE POLICY "Users can view availability based on visibility"
  ON public.availability
  FOR SELECT
  USING (
    -- Users can always see their own availability
    auth.uid() = user_id
    OR
    -- Everyone can see availability marked as 'everyone'
    visible_to = 'everyone'
    OR
    -- Friends can see availability marked as 'friends'
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
  );
