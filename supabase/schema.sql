-- Run this in your Supabase SQL editor to set up the database schema.
-- If you already created the transactions table, run this migration first:
--   alter table public.transactions add column if not exists subcategory text;

-- ─── Transactions ────────────────────────────────────────────────────────────

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  amount      numeric(10, 0) not null check (amount >= 0),
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
