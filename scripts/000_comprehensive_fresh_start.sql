-- =====================================================
-- COMPREHENSIVE FRESH START MIGRATION
-- This script creates the entire database schema from scratch
-- Run this on a fresh Supabase project
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  phone TEXT,
  location TEXT,
  bio TEXT,
  avatar_url TEXT,
  -- Added timezone field for cross-timezone support
  timezone TEXT DEFAULT 'America/New_York',
  available_now BOOLEAN DEFAULT false,
  available_now_energy TEXT,
  available_now_until TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. FRIENDSHIPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- =====================================================
-- 3. FRIEND REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id),
  CHECK (sender_id != receiver_id)
);

-- =====================================================
-- 4. GROUPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. GROUP MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- =====================================================
-- 6. AVAILABILITY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  energy_level TEXT CHECK (energy_level IN ('high', 'low', 'virtual')),
  activity_tags TEXT[],
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  visible_to TEXT DEFAULT 'friends' CHECK (visible_to IN ('friends', 'everyone')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. AVAILABILITY SHARES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS availability_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_id UUID NOT NULL REFERENCES availability(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  shared_with_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (shared_with_user_id IS NOT NULL AND shared_with_group_id IS NULL) OR
    (shared_with_user_id IS NULL AND shared_with_group_id IS NOT NULL)
  )
);

-- =====================================================
-- 8. HANGOUT REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS hangout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_id UUID REFERENCES availability(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  activity_type TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (sender_id != receiver_id)
);

-- =====================================================
-- 9. REQUEST MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES hangout_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. BOOKABLE AVAILABILITY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bookable_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  activity_type TEXT NOT NULL,
  energy_level TEXT NOT NULL CHECK (energy_level IN ('high', 'low', 'virtual')),
  time_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  visible_to TEXT NOT NULL CHECK (visible_to IN ('friends', 'everyone')),
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 11. BOOKINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bookable_availability_id UUID NOT NULL REFERENCES bookable_availability(id) ON DELETE CASCADE,
  booked_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_contact TEXT,
  selected_slot JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  hangout_request_id UUID REFERENCES hangout_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 12. STORAGE BUCKET FOR AVATARS
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 13. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE hangout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookable_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id OR
    -- Can view friends' profiles
    EXISTS (
      SELECT 1 FROM friendships
      WHERE (friendships.user_id = auth.uid() AND friendships.friend_id = profiles.id)
         OR (friendships.friend_id = auth.uid() AND friendships.user_id = profiles.id)
    ) OR
    -- Can view profiles of users in same groups
    EXISTS (
      SELECT 1 FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() AND gm2.user_id = profiles.id
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- FRIENDSHIPS POLICIES
CREATE POLICY "Users can view their friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id);

-- FRIEND REQUESTS POLICIES
CREATE POLICY "Users can view their friend requests"
  ON friend_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friend requests"
  ON friend_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received requests"
  ON friend_requests FOR UPDATE
  USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their sent requests"
  ON friend_requests FOR DELETE
  USING (auth.uid() = sender_id);

-- GROUPS POLICIES
CREATE POLICY "Users can view their groups"
  ON groups FOR SELECT
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their groups"
  ON groups FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their groups"
  ON groups FOR DELETE
  USING (auth.uid() = created_by);

-- GROUP MEMBERS POLICIES
CREATE POLICY "Users can view group members"
  ON group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND (groups.created_by = auth.uid() OR group_members.user_id = auth.uid())
    )
  );

CREATE POLICY "Group creators can add members"
  ON group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  );

CREATE POLICY "Group creators can remove members"
  ON group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.created_by = auth.uid()
    )
  );

-- AVAILABILITY POLICIES
CREATE POLICY "Users can view shared availability"
  ON availability FOR SELECT
  USING (
    auth.uid() = user_id OR
    (is_active = true AND (
      EXISTS (
        SELECT 1 FROM availability_shares
        WHERE availability_shares.availability_id = availability.id
        AND availability_shares.shared_with_user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM availability_shares
        JOIN group_members ON availability_shares.shared_with_group_id = group_members.group_id
        WHERE availability_shares.availability_id = availability.id
        AND group_members.user_id = auth.uid()
      )
    ))
  );

CREATE POLICY "Users can create their availability"
  ON availability FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their availability"
  ON availability FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their availability"
  ON availability FOR DELETE
  USING (auth.uid() = user_id);

-- AVAILABILITY SHARES POLICIES
CREATE POLICY "Users can view their availability shares"
  ON availability_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM availability
      WHERE availability.id = availability_shares.availability_id
      AND availability.user_id = auth.uid()
    ) OR
    shared_with_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = availability_shares.shared_with_group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shares for their availability"
  ON availability_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM availability
      WHERE availability.id = availability_shares.availability_id
      AND availability.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their availability shares"
  ON availability_shares FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM availability
      WHERE availability.id = availability_shares.availability_id
      AND availability.user_id = auth.uid()
    )
  );

-- HANGOUT REQUESTS POLICIES
CREATE POLICY "Users can view their hangout requests"
  ON hangout_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create hangout requests to friends only"
  ON hangout_requests FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE (
        (user_id = auth.uid() AND friend_id = receiver_id)
        OR (friend_id = auth.uid() AND user_id = receiver_id)
      )
    )
  );

CREATE POLICY "Users can update their hangout requests"
  ON hangout_requests FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can delete their sent requests"
  ON hangout_requests FOR DELETE
  USING (auth.uid() = sender_id);

-- REQUEST MESSAGES POLICIES
CREATE POLICY "Users can view request messages"
  ON request_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hangout_requests
      WHERE hangout_requests.id = request_messages.request_id
      AND (hangout_requests.sender_id = auth.uid() OR hangout_requests.receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can create request messages"
  ON request_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM hangout_requests
      WHERE hangout_requests.id = request_messages.request_id
      AND (hangout_requests.sender_id = auth.uid() OR hangout_requests.receiver_id = auth.uid())
    )
  );

-- BOOKABLE AVAILABILITY POLICIES
CREATE POLICY "Users can view active non-expired bookable availability"
  ON bookable_availability FOR SELECT
  USING (
    is_active = true
    AND expires_at > NOW()
    AND (
      visible_to = 'everyone'
      OR auth.uid() = user_id
      OR (
        visible_to = 'friends'
        AND EXISTS (
          SELECT 1 FROM friendships
          WHERE (user_id = bookable_availability.user_id AND friend_id = auth.uid() AND status = 'accepted')
             OR (friend_id = bookable_availability.user_id AND user_id = auth.uid() AND status = 'accepted')
        )
      )
    )
  );

CREATE POLICY "Users can create their bookable availability"
  ON bookable_availability FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their bookable availability"
  ON bookable_availability FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their bookable availability"
  ON bookable_availability FOR DELETE
  USING (auth.uid() = user_id);

-- BOOKINGS POLICIES
CREATE POLICY "Users can view bookings for their availability"
  ON bookings FOR SELECT
  USING (
    auth.uid() = booked_by_user_id OR
    EXISTS (
      SELECT 1 FROM bookable_availability
      WHERE bookable_availability.id = bookings.bookable_availability_id
      AND bookable_availability.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their bookings"
  ON bookings FOR UPDATE
  USING (
    auth.uid() = booked_by_user_id OR
    EXISTS (
      SELECT 1 FROM bookable_availability
      WHERE bookable_availability.id = bookings.bookable_availability_id
      AND bookable_availability.user_id = auth.uid()
    )
  );

-- STORAGE POLICIES FOR AVATARS
CREATE POLICY "Users can view own and friends' avatars"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM friendships
        WHERE (friendships.user_id = auth.uid() AND friendships.friend_id::text = (storage.foldername(name))[1])
           OR (friendships.friend_id = auth.uid() AND friendships.user_id::text = (storage.foldername(name))[1])
      )
    )
  );

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- 14. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX idx_friend_requests_status ON friend_requests(status);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_availability_user_id ON availability(user_id);
CREATE INDEX idx_availability_date ON availability(date);
CREATE INDEX idx_availability_is_active ON availability(is_active);
CREATE INDEX idx_availability_shares_availability_id ON availability_shares(availability_id);
CREATE INDEX idx_availability_shares_user_id ON availability_shares(shared_with_user_id);
CREATE INDEX idx_availability_shares_group_id ON availability_shares(shared_with_group_id);
CREATE INDEX idx_hangout_requests_sender ON hangout_requests(sender_id);
CREATE INDEX idx_hangout_requests_receiver ON hangout_requests(receiver_id);
CREATE INDEX idx_hangout_requests_status ON hangout_requests(status);
CREATE INDEX idx_hangout_requests_availability ON hangout_requests(availability_id);
CREATE INDEX idx_request_messages_request_id ON request_messages(request_id);
CREATE INDEX idx_bookable_availability_user_id ON bookable_availability(user_id);
CREATE INDEX idx_bookable_availability_share_url ON bookable_availability(share_url);
CREATE INDEX idx_bookable_bookings_bookable_id ON bookable_bookings(bookable_availability_id);

-- =====================================================
-- 15. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friend_requests_updated_at
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_updated_at
  BEFORE UPDATE ON availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hangout_requests_updated_at
  BEFORE UPDATE ON hangout_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookable_availability_updated_at
  BEFORE UPDATE ON bookable_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookable_bookings_updated_at
  BEFORE UPDATE ON bookable_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- All tables, policies, indexes, and functions created successfully
-- You can now connect your application to this database
