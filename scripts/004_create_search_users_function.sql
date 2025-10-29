-- ============================================
-- CREATE SECURE USER SEARCH FUNCTION
-- ============================================
-- This function allows users to search for other users to add as friends
-- It bypasses RLS policies since users need to find non-friends to send requests

CREATE OR REPLACE FUNCTION search_users_secure(
  requesting_user_id uuid,
  search_query text
)
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  first_name text,
  last_name text,
  phone text,
  location text,
  avatar_url text,
  bio text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Return users matching the search query, excluding:
  -- 1. The requesting user themselves
  -- 2. Users they're already friends with (accepted status)
  -- 3. Users they have pending requests with
  
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.display_name,
    p.first_name,
    p.last_name,
    p.phone,
    p.location,
    p.avatar_url,
    p.bio,
    p.created_at
  FROM profiles p
  WHERE 
    -- Exclude the requesting user
    p.id != requesting_user_id
    
    -- Match search query (case-insensitive)
    AND (
      p.email ILIKE '%' || search_query || '%'
      OR p.display_name ILIKE '%' || search_query || '%'
      OR p.first_name ILIKE '%' || search_query || '%'
      OR p.last_name ILIKE '%' || search_query || '%'
      OR p.phone ILIKE '%' || search_query || '%'
      OR p.location ILIKE '%' || search_query || '%'
    )
    
    -- Exclude existing friends and pending requests
    AND NOT EXISTS (
      SELECT 1 FROM friendships f
      WHERE (
        (f.user_id = requesting_user_id AND f.friend_id = p.id)
        OR
        (f.friend_id = requesting_user_id AND f.user_id = p.id)
      )
      AND f.status IN ('accepted', 'pending')
    )
  
  ORDER BY p.display_name
  LIMIT 10;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_users_secure(uuid, text) TO authenticated;

-- ============================================
-- ✅ DONE: Users can now search for new friends
-- ============================================
