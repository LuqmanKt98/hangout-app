-- Create friendships table for friend connections
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, friend_id)
);

-- Enable RLS
alter table public.friendships enable row level security;

-- RLS Policies for friendships
create policy "Users can view their own friendships"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can create friendship requests"
  on public.friendships for insert
  with check (auth.uid() = user_id);

create policy "Users can update friendships they're part of"
  on public.friendships for update
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can delete their own friendship requests"
  on public.friendships for delete
  using (auth.uid() = user_id);

-- Create index for faster queries
create index if not exists friendships_user_id_idx on public.friendships(user_id);
create index if not exists friendships_friend_id_idx on public.friendships(friend_id);
