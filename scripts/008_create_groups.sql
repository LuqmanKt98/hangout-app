-- Create groups table
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text default '#6366f1',
  owner_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create group_members table
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamp with time zone default now(),
  unique(group_id, user_id)
);

-- Enable RLS
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- RLS Policies for groups
create policy "Users can view groups they are members of"
  on public.groups for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
    )
  );

create policy "Users can create groups"
  on public.groups for insert
  with check (auth.uid() = owner_id);

create policy "Group owners can update their groups"
  on public.groups for update
  using (auth.uid() = owner_id);

create policy "Group owners can delete their groups"
  on public.groups for delete
  using (auth.uid() = owner_id);

-- RLS Policies for group_members
create policy "Users can view members of groups they belong to"
  on public.group_members for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
    )
  );

create policy "Group owners can add members"
  on public.group_members for insert
  with check (
    exists (
      select 1 from public.groups
      where groups.id = group_members.group_id
      and groups.owner_id = auth.uid()
    )
  );

create policy "Group owners and members themselves can remove members"
  on public.group_members for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.groups
      where groups.id = group_members.group_id
      and groups.owner_id = auth.uid()
    )
  );

-- Create indexes
create index if not exists idx_groups_owner on public.groups(owner_id);
create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_group_members_user on public.group_members(user_id);
