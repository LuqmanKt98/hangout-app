-- Create bookable_availability table (note: correct spelling)
CREATE TABLE IF NOT EXISTS public.bookable_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  activity_type text NOT NULL,
  energy_level text NOT NULL CHECK (energy_level IN ('high', 'low', 'virtual')),
  time_slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  visible_to text NOT NULL CHECK (visible_to IN ('friends', 'everyone')),
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_bookable_availability_user_id ON public.bookable_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_bookable_availability_share_token ON public.bookable_availability(share_token);
CREATE INDEX IF NOT EXISTS idx_bookable_availability_expires_at ON public.bookable_availability(expires_at);

-- Enable RLS
ALTER TABLE public.bookable_availability ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own bookable availability" ON public.bookable_availability;
DROP POLICY IF EXISTS "Users can create bookable availability" ON public.bookable_availability;
DROP POLICY IF EXISTS "Users can update their own bookable availability" ON public.bookable_availability;
DROP POLICY IF EXISTS "Users can delete their own bookable availability" ON public.bookable_availability;
DROP POLICY IF EXISTS "Public can view non-expired bookable availability" ON public.bookable_availability;

-- Create RLS policies
CREATE POLICY "Users can view their own bookable availability"
ON public.bookable_availability FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create bookable availability"
ON public.bookable_availability FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own bookable availability"
ON public.bookable_availability FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own bookable availability"
ON public.bookable_availability FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Public can view non-expired bookable availability"
ON public.bookable_availability FOR SELECT
TO public
USING (is_active = true AND expires_at > now());

-- Add comment
COMMENT ON TABLE public.bookable_availability IS 'Stores bookable availability links that users can share';
