-- Run this in your Supabase SQL editor to set up the database schema.
-- This file is idempotent — safe to run multiple times on an existing database.

-- ─── Transactions ────────────────────────────────────────────────────────────

create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  amount        numeric(12, 2) not null check (amount >= 0),
  currency      text not null default 'TWD',
  exchange_rate numeric(12, 4) not null default 1,
  category      text not null,
  subcategory   text,
  note          text,
  paid_by       text not null,
  created_at    timestamptz not null default now()
);

alter table public.transactions add column if not exists subcategory text;
alter table public.transactions alter column amount type numeric(12,2);
alter table public.transactions add column if not exists currency text not null default 'TWD';
alter table public.transactions add column if not exists exchange_rate numeric(12,4) not null default 1;
alter table public.transactions add column if not exists recurring_id uuid;

alter table public.transactions enable row level security;

-- ─── Recurring rules ──────────────────────────────────────────────────────────

create table if not exists public.recurring_rules (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  ledger_id     uuid references public.ledgers(id) on delete set null,
  amount        numeric(12, 2) not null check (amount >= 0),
  currency      text not null default 'TWD',
  exchange_rate numeric(12, 4) not null default 1,
  category      text not null,
  subcategory   text,
  note          text,
  paid_by       text not null,
  frequency     text not null check (frequency in ('monthly', 'weekly')),
  start_date    date not null,
  end_date      date,
  created_at    timestamptz not null default now()
);

alter table public.recurring_rules enable row level security;

drop policy if exists "recurring_rules_all" on public.recurring_rules;
create policy "recurring_rules_all" on public.recurring_rules
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Clear orphaned recurring_id values (no matching rule row), then add FK
update public.transactions set recurring_id = null where recurring_id is not null;

alter table public.transactions
  drop constraint if exists transactions_recurring_id_fkey;

alter table public.transactions
  add constraint transactions_recurring_id_fkey
  foreign key (recurring_id) references public.recurring_rules(id) on delete set null;

-- Prevent duplicate generation (e.g. from concurrent navigation)
create unique index if not exists transactions_recurring_date_unique
  on public.transactions(recurring_id, date)
  where recurring_id is not null;

-- ─── Categories ──────────────────────────────────────────────────────────────

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  parent_id  uuid references public.categories(id) on delete cascade,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "users_manage_own_categories" on public.categories;
create policy "users_manage_own_categories" on public.categories
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Profiles ────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nickname   text not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text unique;
alter table public.profiles add column if not exists is_admin boolean default false;
alter table public.profiles add column if not exists categories_seeded boolean default false;

alter table public.profiles enable row level security;

drop policy if exists "users_read_all_profiles" on public.profiles;
create policy "users_read_all_profiles" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "users_manage_own_profile" on public.profiles;
create policy "users_manage_own_profile" on public.profiles
  for all using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── Ledgers ─────────────────────────────────────────────────────────────────

create table if not exists public.ledgers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  is_public  boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.ledgers add column if not exists default_currency text not null default 'TWD';

create unique index if not exists one_public_ledger_idx
  on public.ledgers(is_public) where is_public = true;

alter table public.ledgers enable row level security;

-- ─── Ledger members ──────────────────────────────────────────────────────────

create table if not exists public.ledger_members (
  ledger_id  uuid not null references public.ledgers(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ledger_id, user_id)
);

alter table public.ledger_members enable row level security;

-- ─── Security-definer helpers (break circular RLS references) ────────────────

create or replace function public.get_accessible_ledger_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select ledger_id from public.ledger_members where user_id = auth.uid()
$$;

create or replace function public.get_owned_ledger_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select id from public.ledgers where owner_id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(is_admin, false) from public.profiles where id = auth.uid()
$$;

-- ─── Ledger policies ─────────────────────────────────────────────────────────

drop policy if exists "ledgers_select" on public.ledgers;
create policy "ledgers_select" on public.ledgers
  for select using (
    is_public = true
    or owner_id = auth.uid()
    or id in (select get_accessible_ledger_ids())
  );

drop policy if exists "ledgers_insert" on public.ledgers;
create policy "ledgers_insert" on public.ledgers
  for insert with check (auth.uid() = owner_id);

drop policy if exists "ledgers_update" on public.ledgers;
create policy "ledgers_update" on public.ledgers
  for update using (auth.uid() = owner_id and is_public = false);

drop policy if exists "ledgers_delete" on public.ledgers;
create policy "ledgers_delete" on public.ledgers
  for delete using (auth.uid() = owner_id and is_public = false);

-- ─── Ledger member policies ───────────────────────────────────────────────────

drop policy if exists "ledger_members_select" on public.ledger_members;
create policy "ledger_members_select" on public.ledger_members
  for select using (
    user_id = auth.uid()
    or ledger_id in (select get_owned_ledger_ids())
  );

drop policy if exists "ledger_members_insert" on public.ledger_members;
create policy "ledger_members_insert" on public.ledger_members
  for insert with check (
    ledger_id in (
      select id from public.ledgers
      where owner_id = auth.uid() and is_public = false
    )
  );

drop policy if exists "ledger_members_delete" on public.ledger_members;
create policy "ledger_members_delete" on public.ledger_members
  for delete using (
    ledger_id in (select get_owned_ledger_ids())
  );

-- ─── Transaction policies ────────────────────────────────────────────────────

alter table public.transactions
  add column if not exists ledger_id uuid references public.ledgers(id) on delete cascade;

drop policy if exists "all_users_can_read" on public.transactions;
drop policy if exists "users_can_insert_own" on public.transactions;
drop policy if exists "users_can_update_own" on public.transactions;
drop policy if exists "users_can_delete_own" on public.transactions;
drop policy if exists "transactions_select" on public.transactions;
drop policy if exists "transactions_insert" on public.transactions;

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

create policy "users_can_update_own" on public.transactions
  for update using (auth.uid() = user_id or public.is_admin());

create policy "users_can_delete_own" on public.transactions
  for delete using (auth.uid() = user_id or public.is_admin());

-- ─── App settings ─────────────────────────────────────────────────────────────
-- Must come after is_admin() is defined above.

create table if not exists public.app_settings (
  key   text primary key,
  value jsonb not null
);

alter table public.app_settings enable row level security;

drop policy if exists "anyone_can_read_settings" on public.app_settings;
create policy "anyone_can_read_settings" on public.app_settings
  for select using (true);

drop policy if exists "admins_can_modify_settings" on public.app_settings;
create policy "admins_can_modify_settings" on public.app_settings
  for all using (public.is_admin())
  with check (public.is_admin());

insert into public.app_settings (key, value)
values ('registration_enabled', 'true'::jsonb)
on conflict (key) do nothing;
