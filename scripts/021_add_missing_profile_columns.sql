-- Add missing email and phone columns to profiles table
-- These are needed for the search functionality

-- Add email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
    
    -- Create index for faster email searches
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
    
    -- Backfill email from auth.users
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id AND p.email IS NULL;
  END IF;
END $$;

-- Add phone column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
    
    -- Create index for faster phone searches
    CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
    
    -- Backfill phone from auth.users metadata
    UPDATE public.profiles p
    SET phone = u.raw_user_meta_data->>'phone'
    FROM auth.users u
    WHERE p.id = u.id AND p.phone IS NULL;
  END IF;
END $$;

-- Update the handle_new_user trigger to include email and phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    location = COALESCE(EXCLUDED.location, profiles.location),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Recreate the search function with better error handling
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
  -- Search across multiple fields
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(p.display_name, 'Unknown User') as display_name,
    p.avatar_url,
    p.first_name,
    p.last_name,
    p.email,
    p.phone
  FROM profiles p
  WHERE 
    p.id != requesting_user_id
    AND p.display_name IS NOT NULL
    AND p.display_name != ''
    AND (
      p.email ILIKE '%' || search_query || '%'
      OR COALESCE(p.phone, '') ILIKE '%' || search_query || '%'
      OR p.display_name ILIKE '%' || search_query || '%'
      OR COALESCE(p.first_name, '') ILIKE '%' || search_query || '%'
      OR COALESCE(p.last_name, '') ILIKE '%' || search_query || '%'
      OR COALESCE(p.location, '') ILIKE '%' || search_query || '%'
    )
  ORDER BY 
    -- Prioritize exact matches
    CASE 
      WHEN p.email ILIKE search_query THEN 1
      WHEN p.display_name ILIKE search_query THEN 2
      ELSE 3
    END,
    p.display_name
  LIMIT 20;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_users_secure(TEXT, UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION search_users_secure IS 'Securely search for users by email, phone, name, or location. Excludes requesting user from results.';
