-- Create availability table
create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  energy_level text not null check (energy_level in ('low', 'high')),
  message text,
  tags text[] default array[]::text[],
  visible_to text not null default 'friends' check (visible_to in ('friends', 'everyone')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.availability enable row level security;

-- RLS Policies for availability
create policy "Users can view availability based on visibility"
  on public.availability for select
  using (
    visible_to = 'everyone' 
    or auth.uid() = user_id
    or exists (
      select 1 from public.friendships
      where (user_id = availability.user_id and friend_id = auth.uid() and status = 'accepted')
         or (friend_id = availability.user_id and user_id = auth.uid() and status = 'accepted')
    )
  );

create policy "Users can insert their own availability"
  on public.availability for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own availability"
  on public.availability for update
  using (auth.uid() = user_id);

create policy "Users can delete their own availability"
  on public.availability for delete
  using (auth.uid() = user_id);

-- Create indexes
create index if not exists availability_user_id_idx on public.availability(user_id);
create index if not exists availability_date_idx on public.availability(date);
