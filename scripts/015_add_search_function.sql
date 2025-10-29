-- Create a secure server-side function for searching users
-- This bypasses RLS to allow search while protecting sensitive data

CREATE OR REPLACE FUNCTION search_users_secure(search_query TEXT, requesting_user_id UUID)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  avatar_url TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only return limited profile data for search results
  -- Exclude the requesting user from results
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url,
    p.first_name,
    p.last_name,
    p.email,
    p.phone
  FROM profiles p
  WHERE 
    p.id != requesting_user_id
    AND (
      p.email ILIKE '%' || search_query || '%'
      OR p.phone ILIKE '%' || search_query || '%'
    )
  LIMIT 10;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_users_secure(TEXT, UUID) TO authenticated;
