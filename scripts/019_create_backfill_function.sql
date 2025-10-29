-- Create a function that can access auth.users and create missing profiles
CREATE OR REPLACE FUNCTION backfill_missing_profiles()
RETURNS TABLE (
  user_id uuid,
  user_email text,
  profile_created boolean
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO profiles (
    id,
    email,
    display_name,
    first_name,
    last_name,
    location,
    phone,
    avatar_url,
    bio,
    created_at,
    updated_at
  )
  SELECT 
    au.id,
    au.email,
    COALESCE(
      au.raw_user_meta_data->>'display_name',
      COALESCE(au.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(au.raw_user_meta_data->>'last_name', ''),
      split_part(au.email, '@', 1)
    ),
    au.raw_user_meta_data->>'first_name',
    au.raw_user_meta_data->>'last_name',
    au.raw_user_meta_data->>'location',
    au.raw_user_meta_data->>'phone',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || au.email,
    NULL,
    au.created_at,
    now()
  FROM auth.users au
  LEFT JOIN profiles p ON p.id = au.id
  WHERE p.id IS NULL
  RETURNING 
    profiles.id as user_id,
    profiles.email as user_email,
    true as profile_created;
END;
$$;

-- Run the function to create profiles for existing users
SELECT * FROM backfill_missing_profiles();

-- Clean up the function (optional - comment out if you want to keep it)
-- DROP FUNCTION IF EXISTS backfill_missing_profiles();
