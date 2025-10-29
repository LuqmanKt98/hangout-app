-- Create hangout_requests table
create table if not exists public.hangout_requests (
  id uuid primary key default gen_random_uuid(),
  availability_id uuid not null references public.availability(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  requested_date date not null,
  requested_start_time time not null,
  requested_end_time time not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.hangout_requests enable row level security;

-- RLS Policies for hangout_requests
create policy "Users can view requests they sent or received"
  on public.hangout_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can create hangout requests"
  on public.hangout_requests for insert
  with check (auth.uid() = sender_id);

create policy "Users can update requests they received"
  on public.hangout_requests for update
  using (auth.uid() = receiver_id or auth.uid() = sender_id);

create policy "Users can delete requests they sent"
  on public.hangout_requests for delete
  using (auth.uid() = sender_id);

-- Create indexes
create index if not exists hangout_requests_sender_id_idx on public.hangout_requests(sender_id);
create index if not exists hangout_requests_receiver_id_idx on public.hangout_requests(receiver_id);
create index if not exists hangout_requests_availability_id_idx on public.hangout_requests(availability_id);
