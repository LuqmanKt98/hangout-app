-- Backfill profiles for existing auth.users who don't have profiles yet
-- This handles users created before the trigger was fixed

DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all auth.users who don't have a profile
  FOR user_record IN 
    SELECT 
      au.id,
      au.email,
      au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    -- Insert profile for this user
    INSERT INTO public.profiles (
      id,
      email,
      display_name,
      first_name,
      last_name,
      location,
      phone,
      created_at,
      updated_at
    ) VALUES (
      user_record.id,
      user_record.email,
      COALESCE(
        user_record.raw_user_meta_data->>'display_name',
        split_part(user_record.email, '@', 1)
      ),
      user_record.raw_user_meta_data->>'first_name',
      user_record.raw_user_meta_data->>'last_name',
      user_record.raw_user_meta_data->>'location',
      user_record.raw_user_meta_data->>'phone',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created profile for user: %', user_record.email;
  END LOOP;
END $$;

-- Verify the backfill worked
SELECT 
  p.id,
  p.email,
  p.display_name,
  p.first_name,
  p.last_name,
  p.location,
  p.phone
FROM profiles p
ORDER BY p.created_at DESC;
