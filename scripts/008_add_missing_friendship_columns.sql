-- Add missing columns to friendships table
-- This fixes the schema mismatch where the code expects status and updated_at columns

-- Create enum type for friendship status if it doesn't exist
DO $$ BEGIN
  CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add missing status column (default to 'accepted' for existing friendships)
ALTER TABLE friendships 
  ADD COLUMN IF NOT EXISTS status friendship_status DEFAULT 'accepted' NOT NULL;

-- Add missing updated_at column
ALTER TABLE friendships 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS friendships_updated_at_trigger ON friendships;
CREATE TRIGGER friendships_updated_at_trigger
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friendships_updated_at();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status ON friendships(friend_id, status);

-- Grant necessary permissions
GRANT ALL ON friendships TO authenticated;
