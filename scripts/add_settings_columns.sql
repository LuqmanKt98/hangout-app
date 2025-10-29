-- Add privacy_settings and app_settings columns to profiles table
-- These columns store JSON data for user preferences

-- Add privacy_settings column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "availability_visibility": "friends",
  "request_permissions": "friends",
  "profile_visibility": "friends",
  "show_online_status": true,
  "show_location": true,
  "allow_friend_requests": true
}'::jsonb;

-- Add app_settings column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS app_settings JSONB DEFAULT '{
  "notifications_enabled": true,
  "email_notifications": true,
  "push_notifications": true,
  "theme": "system",
  "language": "en"
}'::jsonb;

-- Create indexes for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_profiles_privacy_settings ON profiles USING GIN (privacy_settings);
CREATE INDEX IF NOT EXISTS idx_profiles_app_settings ON profiles USING GIN (app_settings);

-- Update existing profiles to have default settings if they don't have them
UPDATE profiles
SET privacy_settings = '{
  "availability_visibility": "friends",
  "request_permissions": "friends",
  "profile_visibility": "friends",
  "show_online_status": true,
  "show_location": true,
  "allow_friend_requests": true
}'::jsonb
WHERE privacy_settings IS NULL;

UPDATE profiles
SET app_settings = '{
  "notifications_enabled": true,
  "email_notifications": true,
  "push_notifications": true,
  "theme": "system",
  "language": "en"
}'::jsonb
WHERE app_settings IS NULL;

