-- Create bookings table for bookable availability
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bookable_availability_id UUID NOT NULL REFERENCES bookable_availability(id) ON DELETE CASCADE,
  booked_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_contact TEXT,
  selected_slot JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  hangout_request_id UUID REFERENCES hangout_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view bookings they created
CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = booked_by_user_id);

-- Policy: Users can view bookings for their bookable availability
CREATE POLICY "Users can view bookings for their bookable availability"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookable_availability
      WHERE bookable_availability.id = bookings.bookable_availability_id
      AND bookable_availability.user_id = auth.uid()
    )
  );

-- Policy: Authenticated users can create bookings
CREATE POLICY "Authenticated users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = booked_by_user_id);

-- Policy: Users can update their own bookings
CREATE POLICY "Users can update their own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = booked_by_user_id);

-- Policy: Bookable availability owners can update bookings
CREATE POLICY "Bookable availability owners can update bookings"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bookable_availability
      WHERE bookable_availability.id = bookings.bookable_availability_id
      AND bookable_availability.user_id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_bookable_availability_id ON bookings(bookable_availability_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booked_by_user_id ON bookings(booked_by_user_id);
