-- Complete fix for friend search functionality
-- This adds missing columns and creates the search function

-- Step 1: Add missing email and phone columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Step 2: Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Step 3: Backfill email from auth.users for existing profiles
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Step 4: Backfill phone from auth.users metadata for existing profiles
UPDATE profiles p
SET phone = u.raw_user_meta_data->>'phone'
FROM auth.users u
WHERE p.id = u.id AND p.phone IS NULL;

-- Step 5: Drop the old function if it exists (with wrong parameter order)
DROP FUNCTION IF EXISTS search_users_secure(TEXT, UUID);
DROP FUNCTION IF EXISTS search_users_secure(UUID, TEXT);

-- Step 6: Create the search function with CORRECT parameter order
-- Note: requesting_user_id comes FIRST, search_query comes SECOND
CREATE OR REPLACE FUNCTION search_users_secure(
  requesting_user_id UUID,
  search_query TEXT
)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  avatar_url TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Return limited profile data for search results
  -- Exclude the requesting user from results
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.location
  FROM profiles p
  WHERE 
    p.id != requesting_user_id
    AND (
      LOWER(p.email) LIKE LOWER('%' || search_query || '%')
      OR LOWER(p.phone) LIKE LOWER('%' || search_query || '%')
      OR LOWER(p.display_name) LIKE LOWER('%' || search_query || '%')
      OR LOWER(p.first_name) LIKE LOWER('%' || search_query || '%')
      OR LOWER(p.last_name) LIKE LOWER('%' || search_query || '%')
    )
  ORDER BY 
    -- Prioritize exact matches
    CASE 
      WHEN LOWER(p.email) = LOWER(search_query) THEN 1
      WHEN LOWER(p.phone) = LOWER(search_query) THEN 2
      WHEN LOWER(p.display_name) = LOWER(search_query) THEN 3
      ELSE 4
    END,
    p.display_name
  LIMIT 20;
END;
$$;

-- Step 7: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_users_secure(UUID, TEXT) TO authenticated;

-- Step 8: Update the handle_new_user trigger to include email and phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    first_name,
    last_name,
    location,
    avatar_url,
    phone
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'location',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

-- Verify the function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'search_users_secure'
  ) THEN
    RAISE EXCEPTION 'Function search_users_secure was not created successfully';
  END IF;
END $$;
