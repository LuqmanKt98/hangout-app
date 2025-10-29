-- Add first_name, last_name, and location to profiles table
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists location text;

-- Update the trigger function to handle new fields
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, display_name, location, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', null),
    coalesce(new.raw_user_meta_data ->> 'last_name', null),
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      concat(
        coalesce(new.raw_user_meta_data ->> 'first_name', ''),
        ' ',
        coalesce(new.raw_user_meta_data ->> 'last_name', '')
      ),
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data ->> 'location', null),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
