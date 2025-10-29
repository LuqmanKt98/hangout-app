-- Add location column to availability table
ALTER TABLE public.availability
ADD COLUMN IF NOT EXISTS location text;

-- Add comment
COMMENT ON COLUMN public.availability.location IS 'Location for the availability (optional)';
