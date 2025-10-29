-- Fix friend data issues
-- This script will clean up any inconsistent data and show what's in the tables

-- First, let's see what's in the friend_requests table
SELECT 'Friend Requests:' as info;
SELECT * FROM friend_requests ORDER BY created_at DESC LIMIT 10;

-- Check friendships table
SELECT 'Friendships:' as info;
SELECT * FROM friendships ORDER BY created_at DESC LIMIT 10;

-- Find accepted friend requests that don't have corresponding friendships
SELECT 'Accepted requests without friendships:' as info;
SELECT fr.*
FROM friend_requests fr
WHERE fr.status = 'accepted'
AND NOT EXISTS (
  SELECT 1 FROM friendships f
  WHERE (f.user_id = fr.sender_id AND f.friend_id = fr.receiver_id)
     OR (f.user_id = fr.receiver_id AND f.friend_id = fr.sender_id)
);

-- Clean up: Delete rejected or old pending requests (older than 30 days)
DELETE FROM friend_requests
WHERE status = 'rejected'
   OR (status = 'pending' AND created_at < NOW() - INTERVAL '30 days');

-- For any accepted friend requests without friendships, create them
INSERT INTO friendships (user_id, friend_id)
SELECT fr.sender_id, fr.receiver_id
FROM friend_requests fr
WHERE fr.status = 'accepted'
AND NOT EXISTS (
  SELECT 1 FROM friendships f
  WHERE f.user_id = fr.sender_id AND f.friend_id = fr.receiver_id
)
ON CONFLICT (user_id, friend_id) DO NOTHING;

INSERT INTO friendships (user_id, friend_id)
SELECT fr.receiver_id, fr.sender_id
FROM friend_requests fr
WHERE fr.status = 'accepted'
AND NOT EXISTS (
  SELECT 1 FROM friendships f
  WHERE f.user_id = fr.receiver_id AND f.friend_id = fr.sender_id
)
ON CONFLICT (user_id, friend_id) DO NOTHING;

-- Show final state
SELECT 'Final Friend Requests:' as info;
SELECT * FROM friend_requests ORDER BY created_at DESC LIMIT 10;

SELECT 'Final Friendships:' as info;
SELECT * FROM friendships ORDER BY created_at DESC LIMIT 10;
