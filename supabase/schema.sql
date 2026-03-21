-- Run this in your Supabase SQL editor to set up the database schema.
-- If you already created the transactions table, run these migrations:
--   alter table public.transactions add column if not exists subcategory text;
--   alter table public.transactions alter column amount type numeric(12,2);
--   alter table public.transactions add column if not exists currency text not null default 'TWD';
--   alter table public.transactions add column if not exists exchange_rate numeric(12,4) not null default 1;

-- ─── Transactions ────────────────────────────────────────────────────────────

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  amount      numeric(12, 2) not null check (amount >= 0),
  currency    text not null default 'TWD',
  exchange_rate numeric(12, 4) not null default 1,
  category    text not null,
  subcategory text,
  note        text,
  paid_by     text not null,
  created_at  timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "all_users_can_read" on public.transactions
  for select using (auth.role() = 'authenticated');

create policy "users_can_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "users_can_update_own" on public.transactions
  for update using (auth.uid() = user_id);

create policy "users_can_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

-- ─── Categories ──────────────────────────────────────────────────────────────
-- parent_id = NULL  →  top-level category
-- parent_id = <id>  →  subcategory of that category

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  parent_id  uuid references public.categories(id) on delete cascade,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "users_manage_own_categories" on public.categories
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- Run this migration if the profiles table does not yet exist.

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null,
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users_read_all_profiles" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "users_manage_own_profile" on public.profiles
  for all using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── Ledgers ──────────────────────────────────────────────────────────────────
-- Run this migration to add multi-ledger support.
-- Step 1: add email to profiles
alter table public.profiles add column if not exists email text unique;

-- Step 2: create ledgers table
create table if not exists public.ledgers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Enforce only one shared public ledger
create unique index if not exists one_public_ledger_idx
  on public.ledgers(is_public) where is_public = true;

alter table public.ledgers enable row level security;

-- Note: ledgers_select is added AFTER ledger_members table is created (see below)
create policy "ledgers_insert" on public.ledgers
  for insert with check (auth.uid() = owner_id);

create policy "ledgers_update" on public.ledgers
  for update using (auth.uid() = owner_id and is_public = false);

create policy "ledgers_delete" on public.ledgers
  for delete using (auth.uid() = owner_id and is_public = false);

-- Step 3: create ledger_members table (shared access for private ledgers)
create table if not exists public.ledger_members (
  ledger_id   uuid not null references public.ledgers(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (ledger_id, user_id)
);

alter table public.ledger_members enable row level security;

create policy "ledger_members_select" on public.ledger_members
  for select using (
    user_id = auth.uid()
    or ledger_id in (select id from public.ledgers where owner_id = auth.uid())
  );

create policy "ledger_members_insert" on public.ledger_members
  for insert with check (
    ledger_id in (
      select id from public.ledgers
      where owner_id = auth.uid() and is_public = false
    )
  );

create policy "ledger_members_delete" on public.ledger_members
  for delete using (
    ledger_id in (select id from public.ledgers where owner_id = auth.uid())
  );

-- Step 4: create security definer helpers to break the circular RLS reference,
-- then add policies that reference each other's table via these functions.
create or replace function public.get_accessible_ledger_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select ledger_id from public.ledger_members where user_id = auth.uid()
$$;

create or replace function public.get_owned_ledger_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select id from public.ledgers where owner_id = auth.uid()
$$;

create policy "ledgers_select" on public.ledgers
  for select using (
    is_public = true
    or owner_id = auth.uid()
    or id in (select get_accessible_ledger_ids())
  );

drop policy if exists "ledger_members_select" on public.ledger_members;
create policy "ledger_members_select" on public.ledger_members
  for select using (
    user_id = auth.uid()
    or ledger_id in (select get_owned_ledger_ids())
  );

-- Step 5: add ledger_id to transactions
alter table public.transactions
  add column if not exists ledger_id uuid references public.ledgers(id) on delete cascade;

-- Step 5: update transactions SELECT policy to be ledger-aware
drop policy if exists "all_users_can_read" on public.transactions;
create policy "transactions_select" on public.transactions
  for select using (
    ledger_id is null
    or ledger_id in (
      select id from public.ledgers
      where is_public = true
        or owner_id = auth.uid()
        or id in (select ledger_id from public.ledger_members where user_id = auth.uid())
    )
  );

-- Step 6: update transactions INSERT policy to check ledger access
drop policy if exists "users_can_insert_own" on public.transactions;
create policy "transactions_insert" on public.transactions
  for insert with check (
    auth.uid() = user_id
    and (
      ledger_id is null
      or ledger_id in (
        select id from public.ledgers
        where is_public = true or owner_id = auth.uid()
      )
    )
  );
