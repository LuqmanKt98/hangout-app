-- Create bookable_availability table for shareable booking links
create table if not exists public.bookable_availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  activity_type text not null,
  energy_level text not null check (energy_level in ('low', 'high', 'virtual')),
  time_slots jsonb not null, -- Array of {date, start_time, end_time}
  visible_to text not null default 'friends' check (visible_to in ('friends', 'everyone')),
  share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  is_active boolean default true,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create bookings table to track who booked what
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  bookable_availability_id uuid not null references public.bookable_availability(id) on delete cascade,
  booked_by_user_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  guest_contact text,
  selected_slot jsonb not null, -- {date, start_time, end_time}
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  hangout_request_id uuid references public.hangout_requests(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.bookable_availability enable row level security;
alter table public.bookings enable row level security;

-- RLS Policies for bookable_availability
create policy "Anyone can view active non-expired bookable availability"
  on public.bookable_availability for select
  using (
    is_active = true 
    and expires_at > now()
    and (
      visible_to = 'everyone'
      or auth.uid() = user_id
      or (
        visible_to = 'friends' 
        and exists (
          select 1 from public.friendships
          where (user_id = bookable_availability.user_id and friend_id = auth.uid() and status = 'accepted')
             or (friend_id = bookable_availability.user_id and user_id = auth.uid() and status = 'accepted')
        )
      )
    )
  );

create policy "Users can insert their own bookable availability"
  on public.bookable_availability for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own bookable availability"
  on public.bookable_availability for update
  using (auth.uid() = user_id);

create policy "Users can delete their own bookable availability"
  on public.bookable_availability for delete
  using (auth.uid() = user_id);

-- RLS Policies for bookings
create policy "Users can view bookings for their bookable availability"
  on public.bookings for select
  using (
    auth.uid() in (
      select user_id from public.bookable_availability 
      where id = bookings.bookable_availability_id
    )
    or auth.uid() = booked_by_user_id
  );

create policy "Authenticated users can create bookings"
  on public.bookings for insert
  with check (auth.uid() = booked_by_user_id);

create policy "Users can update their own bookings or bookings for their availability"
  on public.bookings for update
  using (
    auth.uid() = booked_by_user_id
    or auth.uid() in (
      select user_id from public.bookable_availability 
      where id = bookings.bookable_availability_id
    )
  );

-- Create indexes
create index if not exists bookable_availability_user_id_idx on public.bookable_availability(user_id);
create index if not exists bookable_availability_share_token_idx on public.bookable_availability(share_token);
create index if not exists bookable_availability_expires_at_idx on public.bookable_availability(expires_at);
create index if not exists bookings_bookable_availability_id_idx on public.bookings(bookable_availability_id);
create index if not exists bookings_booked_by_user_id_idx on public.bookings(booked_by_user_id);
