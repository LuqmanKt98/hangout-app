-- Add onboarding_completed field to profiles table
alter table public.profiles
add column if not exists onboarding_completed boolean default false,
add column if not exists onboarding_completed_at timestamp with time zone;
