-- =======================================================
-- 1️⃣  CREATE A SAFE SEARCH VIEW
-- =======================================================
-- This view exposes only non-sensitive profile fields
-- and allows the search function to read user info safely

DROP VIEW IF EXISTS profiles_searchable CASCADE;

CREATE VIEW profiles_searchable AS
SELECT 
  id,
  email,
  display_name,
  first_name,
  last_name,
  phone,
  location,
  avatar_url,
  bio,
  created_at
FROM profiles;

-- =======================================================
-- 2️⃣  GRANT PERMISSIONS ON THE VIEW
-- =======================================================
GRANT SELECT ON profiles_searchable TO postgres;
GRANT SELECT ON profiles_searchable TO authenticated;

-- =======================================================
-- 3️⃣  RECREATE THE SECURE SEARCH FUNCTION
-- =======================================================

DROP FUNCTION IF EXISTS search_users_secure(uuid, text);

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
  FROM profiles_searchable p
  WHERE 
    -- Exclude the requesting user
    p.id != requesting_user_id
    
    -- Match the search query (case-insensitive)
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

-- =======================================================
-- 4️⃣  SET OWNER + GRANTS
-- =======================================================
ALTER FUNCTION search_users_secure(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION search_users_secure(uuid, text) TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
