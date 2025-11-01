-- Create bookable_bookings table for bookable availability bookings
CREATE TABLE IF NOT EXISTS public.bookable_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bookable_availability_id UUID NOT NULL REFERENCES public.bookable_availability(id) ON DELETE CASCADE,
  booked_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_contact TEXT,
  time_slot JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  hangout_request_id UUID REFERENCES public.hangout_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bookable_bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view bookings they created
CREATE POLICY "Users can view their own bookable bookings"
  ON public.bookable_bookings FOR SELECT
  USING (auth.uid() = booked_by_user_id);

-- Policy: Users can view bookings for their bookable availability
CREATE POLICY "Users can view bookings for their bookable availability"
  ON public.bookable_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookable_availability
      WHERE public.bookable_availability.id = public.bookable_bookings.bookable_availability_id
      AND public.bookable_availability.user_id = auth.uid()
    )
  );

-- Policy: Authenticated users can create bookings
CREATE POLICY "Authenticated users can create bookable bookings"
  ON public.bookable_bookings FOR INSERT
  WITH CHECK (auth.uid() = booked_by_user_id);

-- Policy: Users can update their own bookings
CREATE POLICY "Users can update their own bookable bookings"
  ON public.bookable_bookings FOR UPDATE
  USING (auth.uid() = booked_by_user_id);

-- Policy: Bookable availability owners can update bookings
CREATE POLICY "Bookable availability owners can update bookable bookings"
  ON public.bookable_bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookable_availability
      WHERE public.bookable_availability.id = public.bookable_bookings.bookable_availability_id
      AND public.bookable_availability.user_id = auth.uid()
    )
  );

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bookable_bookings_bookable_availability_id ON public.bookable_bookings(bookable_availability_id);
CREATE INDEX IF NOT EXISTS idx_bookable_bookings_booked_by_user_id ON public.bookable_bookings(booked_by_user_id);
CREATE INDEX IF NOT EXISTS idx_bookable_bookings_created_at ON public.bookable_bookings(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_bookable_bookings_updated_at
  BEFORE UPDATE ON public.bookable_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

