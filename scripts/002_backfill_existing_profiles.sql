-- Backfill profiles for existing auth users
-- This script creates profile records for users who signed up before the trigger was created

INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  display_name,
  phone,
  timezone,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'first_name' as first_name,
  au.raw_user_meta_data->>'last_name' as last_name,
  au.raw_user_meta_data->>'display_name' as display_name,
  au.raw_user_meta_data->>'phone' as phone,
  'America/New_York' as timezone, -- Default timezone, users can update later
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL; -- Only insert if profile doesn't exist

-- Show the newly created profiles
SELECT id, email, first_name, last_name, display_name, created_at 
FROM profiles 
ORDER BY created_at DESC;
