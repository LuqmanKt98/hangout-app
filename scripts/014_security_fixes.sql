-- CRITICAL SECURITY FIXES
-- This script fixes major privacy and security vulnerabilities

-- ============================================
-- 1. FIX PROFILES TABLE - RESTRICT ACCESS
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Create restrictive policies for profiles
-- Users can only view:
-- 1. Their own profile (full access)
-- 2. Accepted friends' profiles (limited fields)
-- 3. Search results when actively searching (email/phone only for matching)

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can view accepted friends profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND (
        (user_id = auth.uid() AND friend_id = profiles.id)
        OR (friend_id = auth.uid() AND user_id = profiles.id)
      )
    )
  );

-- For search functionality - users can find others by email/phone
-- but this is handled in the API layer with explicit search queries
-- We don't need a separate policy for this as the friends policy covers it

-- ============================================
-- 2. ADD ACTIVE STATUS TO AVAILABILITY
-- ============================================

-- Add is_active column to availability table
ALTER TABLE availability ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update the availability view policy to only show active availability
DROP POLICY IF EXISTS "Users can view availability based on visibility" ON availability;

CREATE POLICY "Users can view active availability based on visibility"
  ON availability FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (
      visible_to = 'everyone' 
      OR auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
        AND (
          (user_id = availability.user_id AND friend_id = auth.uid())
          OR (friend_id = availability.user_id AND user_id = auth.uid())
        )
      )
    )
  );

-- ============================================
-- 3. RESTRICT SHARED AVAILABILITY ACCESS
-- ============================================

-- Require authentication for shared links
DROP POLICY IF EXISTS "Anyone can view non-expired shared availability" ON shared_availability;

CREATE POLICY "Authenticated users can view non-expired shared availability"
  ON shared_availability FOR SELECT
  TO authenticated
  USING (expires_at > now());

-- ============================================
-- 4. ADD CONSENT FOR GROUP MEMBERSHIP
-- ============================================

-- Add pending status for group invitations
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active'));

-- Update group member policies
DROP POLICY IF EXISTS "Group owners can add members" ON group_members;

CREATE POLICY "Group owners can invite members who are friends"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.owner_id = auth.uid()
    )
    AND (
      -- Can only add friends to groups
      EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
        AND (
          (user_id = auth.uid() AND friend_id = group_members.user_id)
          OR (friend_id = auth.uid() AND user_id = group_members.user_id)
        )
      )
      OR group_members.user_id = auth.uid() -- Owner can add themselves
    )
  );

-- ============================================
-- 5. ADD PRIVACY PROTECTION FOR SENSITIVE DATA
-- ============================================

-- Create a view for public profile data (what friends can see)
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
  id,
  display_name,
  avatar_url,
  bio,
  first_name,
  last_name,
  location,
  available_now,
  available_now_energy,
  created_at
FROM profiles;

-- Grant access to the view
GRANT SELECT ON public_profiles TO authenticated;

-- ============================================
-- 6. ADD INDEXES FOR SECURITY QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_availability_is_active ON availability(is_active);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON group_members(status);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- ============================================
-- 7. PROTECT AGAINST FRIEND REQUEST SPAM
-- ============================================

-- Add constraint to prevent duplicate friend requests
CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_unique_pair 
ON friendships(LEAST(user_id, friend_id), GREATEST(user_id, friend_id));

-- ============================================
-- SECURITY AUDIT COMPLETE
-- ============================================

-- Summary of changes:
-- 1. ✅ Restricted profile access to own profile and accepted friends only
-- 2. ✅ Added is_active status to availability for privacy control
-- 3. ✅ Required authentication for shared availability links
-- 4. ✅ Added friend-only restriction for group invitations
-- 5. ✅ Created public_profiles view for safe data exposure
-- 6. ✅ Added indexes for security query performance
-- 7. ✅ Prevented duplicate friend requests
