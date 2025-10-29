-- Create shared_availability table for public share links
create table if not exists public.shared_availability (
  id uuid primary key default gen_random_uuid(),
  availability_id uuid not null references public.availability(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.shared_availability enable row level security;

-- RLS Policies for shared_availability
create policy "Anyone can view non-expired shared availability"
  on public.shared_availability for select
  using (expires_at > now());

create policy "Users can create shared links for their availability"
  on public.shared_availability for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own shared links"
  on public.shared_availability for delete
  using (auth.uid() = user_id);

-- Create index
create index if not exists shared_availability_id_idx on public.shared_availability(id);
create index if not exists shared_availability_expires_at_idx on public.shared_availability(expires_at);
