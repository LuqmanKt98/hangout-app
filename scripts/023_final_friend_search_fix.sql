-- COMPREHENSIVE FIX FOR FRIEND SEARCH
-- This script adds missing columns, creates the search function, and fixes the trigger
-- Run this script in your Supabase SQL editor

-- ============================================
-- STEP 1: Add missing columns to profiles
-- ============================================

-- Add email column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Add phone column  
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- ============================================
-- STEP 2: Backfill existing profiles with data
-- ============================================

-- Backfill email from auth.users
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Backfill phone from auth.users metadata
UPDATE profiles p
SET phone = u.raw_user_meta_data->>'phone'
FROM auth.users u
WHERE p.id = u.id AND (p.phone IS NULL OR p.phone = '');

-- ============================================
-- STEP 3: Create the search function
-- ============================================

-- Drop any existing versions of the function
DROP FUNCTION IF EXISTS search_users_secure(TEXT, UUID);
DROP FUNCTION IF EXISTS search_users_secure(UUID, TEXT);

-- Create the search function with correct parameter order
-- IMPORTANT: requesting_user_id comes FIRST, search_query comes SECOND
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
  -- Search across email, phone, name, and location
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(p.display_name, 'Unknown User') as display_name,
    p.avatar_url,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.location
  FROM profiles p
  WHERE 
    p.id != requesting_user_id
    AND p.display_name IS NOT NULL
    AND p.display_name != ''
    AND (
      LOWER(COALESCE(p.email, '')) LIKE LOWER('%' || search_query || '%')
      OR LOWER(COALESCE(p.phone, '')) LIKE LOWER('%' || search_query || '%')
      OR LOWER(COALESCE(p.display_name, '')) LIKE LOWER('%' || search_query || '%')
      OR LOWER(COALESCE(p.first_name, '')) LIKE LOWER('%' || search_query || '%')
      OR LOWER(COALESCE(p.last_name, '')) LIKE LOWER('%' || search_query || '%')
      OR LOWER(COALESCE(p.location, '')) LIKE LOWER('%' || search_query || '%')
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_users_secure(UUID, TEXT) TO authenticated;

-- ============================================
-- STEP 4: Update the handle_new_user trigger
-- ============================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated trigger function that includes email and phone
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
    phone,
    bio,
    available_now,
    available_now_energy,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'location',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone',
    '',
    false,
    NULL,
    false
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 5: Verify everything is set up correctly
-- ============================================

-- Check if the function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'search_users_secure'
  ) THEN
    RAISE EXCEPTION 'ERROR: Function search_users_secure was not created!';
  ELSE
    RAISE NOTICE 'SUCCESS: Function search_users_secure created successfully';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    RAISE EXCEPTION 'ERROR: Column email was not added to profiles!';
  ELSE
    RAISE NOTICE 'SUCCESS: Column email exists in profiles table';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'phone'
  ) THEN
    RAISE EXCEPTION 'ERROR: Column phone was not added to profiles!';
  ELSE
    RAISE NOTICE 'SUCCESS: Column phone exists in profiles table';
  END IF;
  
  RAISE NOTICE '✅ All friend search components are set up correctly!';
END $$;

-- Show current profiles to verify data
SELECT 
  id,
  email,
  phone,
  display_name,
  first_name,
  last_name
FROM profiles
ORDER BY created_at DESC
LIMIT 5;
