-- =====================================================
-- CLEAN ALL DATA FROM DATABASE
-- This script deletes all data from all tables
-- =====================================================

-- Delete in order to respect foreign key constraints

-- 1. Delete bookings
DELETE FROM bookings;

-- 2. Delete bookable availability
DELETE FROM bookable_availability;

-- 3. Delete request messages
DELETE FROM request_messages;

-- 4. Delete hangout requests
DELETE FROM hangout_requests;

-- 5. Delete availability shares
DELETE FROM availability_shares;

-- 6. Delete availability
DELETE FROM availability;

-- 7. Delete group members
DELETE FROM group_members;

-- 8. Delete groups
DELETE FROM groups;

-- 9. Delete friend requests
DELETE FROM friend_requests;

-- 10. Delete friendships
DELETE FROM friendships;

-- 11. Delete profiles (this will cascade to auth.users)
-- Note: This will delete user accounts completely
DELETE FROM profiles;

-- =====================================================
-- DATA CLEANUP COMPLETE
-- =====================================================
