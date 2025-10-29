-- Create availability_shares table to track which friends can see specific availabilities
CREATE TABLE IF NOT EXISTS public.availability_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_id uuid NOT NULL REFERENCES public.availability(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(availability_id, shared_with_user_id)
);

-- Add RLS policies
ALTER TABLE public.availability_shares ENABLE ROW LEVEL SECURITY;

-- Users can view shares for their own availabilities
CREATE POLICY "Users can view their own availability shares"
ON public.availability_shares FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.availability
    WHERE id = availability_shares.availability_id
    AND user_id = auth.uid()
  )
);

-- Users can view shares where they are the recipient
CREATE POLICY "Users can view shares shared with them"
ON public.availability_shares FOR SELECT
TO authenticated
USING (shared_with_user_id = auth.uid());

-- Users can create shares for their own availabilities
CREATE POLICY "Users can create shares for their availabilities"
ON public.availability_shares FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.availability
    WHERE id = availability_shares.availability_id
    AND user_id = auth.uid()
  )
);

-- Users can delete their own availability shares
CREATE POLICY "Users can delete their own availability shares"
ON public.availability_shares FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.availability
    WHERE id = availability_shares.availability_id
    AND user_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_availability_shares_availability_id ON public.availability_shares(availability_id);
CREATE INDEX IF NOT EXISTS idx_availability_shares_shared_with_user_id ON public.availability_shares(shared_with_user_id);
