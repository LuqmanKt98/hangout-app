-- Diagnostic script to check user and profile status

-- First, let's see what's in the profiles table
SELECT 
  'Existing Profiles' as check_type,
  COUNT(*) as count
FROM profiles;

-- Show all existing profiles
SELECT 
  'Profile Details' as info,
  id,
  email,
  display_name,
  first_name,
  last_name,
  phone,
  location,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- Try to check auth.users (this might fail due to permissions)
DO $$
BEGIN
  -- Attempt to count auth users
  RAISE NOTICE 'Checking auth.users...';
  PERFORM COUNT(*) FROM auth.users;
  RAISE NOTICE 'Auth users table is accessible';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Cannot access auth.users - permission denied';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error accessing auth.users: %', SQLERRM;
END $$;
