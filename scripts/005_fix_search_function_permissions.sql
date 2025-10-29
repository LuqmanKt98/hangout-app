-- Fix permissions for search_users_secure function
-- This ensures the function can bypass RLS and be called by authenticated users

-- 1. Change function owner to postgres for full privileges
ALTER FUNCTION search_users_secure(uuid, text) OWNER TO postgres;

-- 2. Grant schema usage to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;

-- 3. Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION search_users_secure(uuid, text) TO authenticated;

-- 4. Ensure profiles table is readable by postgres (function owner)
GRANT SELECT ON profiles TO postgres;

-- 5. Verify the function exists and has correct signature
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'search_users_secure'
  ) THEN
    RAISE EXCEPTION 'Function search_users_secure does not exist. Please run script 004 first.';
  END IF;
END $$;

-- Success message
SELECT 'Function permissions fixed successfully!' as status;
