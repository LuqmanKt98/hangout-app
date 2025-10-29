-- Add available_now fields to profiles table
alter table public.profiles
add column if not exists available_now boolean default false,
add column if not exists available_now_energy text check (available_now_energy in ('high', 'low', 'virtual')),
add column if not exists available_now_until timestamp with time zone,
add column if not exists available_now_updated_at timestamp with time zone;

-- Create index for querying available users
create index if not exists idx_profiles_available_now on public.profiles(available_now) where available_now = true;
