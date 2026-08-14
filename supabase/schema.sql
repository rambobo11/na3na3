-- Na3Na3: run this in Supabase → SQL Editor

create extension if not exists "pgcrypto";

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  logged_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade
);

create index if not exists entries_user_logged_at_idx
  on public.entries (user_id, logged_at desc);

alter table public.entries enable row level security;

create policy "entries_select_own"
  on public.entries for select
  using (auth.uid() = user_id);

create policy "entries_insert_own"
  on public.entries for insert
  with check (auth.uid() = user_id);

create policy "entries_delete_own"
  on public.entries for delete
  using (auth.uid() = user_id);

-- Realtime (optional). Ignore error if already added.
do $$
begin
  alter publication supabase_realtime add table public.entries;
exception
  when duplicate_object then null;
end $$;
