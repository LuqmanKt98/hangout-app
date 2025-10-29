-- Create messages table for hangout coordination
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  hangout_request_id uuid not null references public.hangout_requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.messages enable row level security;

-- RLS Policies for messages
create policy "Users can view messages for their hangout requests"
  on public.messages for select
  using (
    exists (
      select 1 from public.hangout_requests
      where id = messages.hangout_request_id
        and (sender_id = auth.uid() or receiver_id = auth.uid())
    )
  );

create policy "Users can insert messages for their hangout requests"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.hangout_requests
      where id = hangout_request_id
        and (sender_id = auth.uid() or receiver_id = auth.uid())
    )
  );

-- Create index
create index if not exists messages_hangout_request_id_idx on public.messages(hangout_request_id);
create index if not exists messages_created_at_idx on public.messages(created_at);
