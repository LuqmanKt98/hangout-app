-- Fix accepted friend requests that don't have corresponding friendships
-- This creates the missing friendship records

-- Show current state
SELECT 'Accepted friend requests:' as info;
SELECT * FROM friend_requests WHERE status = 'accepted';

SELECT 'Current friendships:' as info;
SELECT * FROM friendships;

-- Create friendships for accepted requests (both directions)
INSERT INTO friendships (user_id, friend_id)
SELECT sender_id, receiver_id
FROM friend_requests
WHERE status = 'accepted'
AND NOT EXISTS (
  SELECT 1 FROM friendships
  WHERE user_id = friend_requests.sender_id
  AND friend_id = friend_requests.receiver_id
)
ON CONFLICT (user_id, friend_id) DO NOTHING;

INSERT INTO friendships (user_id, friend_id)
SELECT receiver_id, sender_id
FROM friend_requests
WHERE status = 'accepted'
AND NOT EXISTS (
  SELECT 1 FROM friendships
  WHERE user_id = friend_requests.receiver_id
  AND friend_id = friend_requests.sender_id
)
ON CONFLICT (user_id, friend_id) DO NOTHING;

-- Show final state
SELECT 'Fixed friendships:' as info;
SELECT * FROM friendships;
