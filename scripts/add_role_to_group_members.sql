-- Add role column to group_members if it doesn't exist
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member'));
