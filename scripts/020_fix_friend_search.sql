-- Fix friend search functionality
-- This script ensures the phone column exists and updates the search function

-- Step 1: Add phone column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Step 2: Create index for phone searches
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- Step 3: Update the search function to be more robust
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
  -- Return limited profile data for search results
  -- Exclude the requesting user from results
  -- Search by email, phone, display_name, first_name, or last_name
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
    AND p.display_name IS NOT NULL
    AND (
      p.email ILIKE '%' || search_query || '%'
      OR COALESCE(p.phone, '') ILIKE '%' || search_query || '%'
      OR p.display_name ILIKE '%' || search_query || '%'
      OR COALESCE(p.first_name, '') ILIKE '%' || search_query || '%'
      OR COALESCE(p.last_name, '') ILIKE '%' || search_query || '%'
    )
  ORDER BY 
    -- Prioritize exact matches
    CASE 
      WHEN p.email = search_query THEN 1
      WHEN p.phone = search_query THEN 2
      WHEN p.display_name ILIKE search_query THEN 3
      ELSE 4
    END,
    p.display_name
  LIMIT 20;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_users_secure(TEXT, UUID) TO authenticated;

-- Step 4: Ensure all existing profiles have display_name
UPDATE profiles 
SET display_name = split_part(email, '@', 1)
WHERE display_name IS NULL OR display_name = '';

-- Step 5: Add a check to prevent NULL display_names in the future
ALTER TABLE profiles 
ALTER COLUMN display_name SET NOT NULL;

-- Step 6: Update the handle_new_user function to ensure display_name is never NULL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    display_name, 
    first_name, 
    last_name, 
    location, 
    phone,
    avatar_url
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'first_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'location',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    location = COALESCE(EXCLUDED.location, profiles.location),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
