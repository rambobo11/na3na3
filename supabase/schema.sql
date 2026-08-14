-- Na3Na3: run this in Supabase → SQL Editor
-- Intentional: no UPDATE policy — rows are immutable from the client.

create extension if not exists "pgcrypto";

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  logged_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade
);

create index if not exists entries_user_logged_at_idx
  on public.entries (user_id, logged_at desc);

alter table public.entries enable row level security;

-- Authenticated clients only; anon has no grants beyond what Supabase defaults allow with RLS.
grant select, insert, delete on table public.entries to authenticated;
grant all on table public.entries to service_role;

drop policy if exists "entries_select_own" on public.entries;
drop policy if exists "entries_insert_own" on public.entries;
drop policy if exists "entries_delete_own" on public.entries;

create policy "entries_select_own"
  on public.entries for select
  to authenticated
  using (auth.uid() = user_id);

create policy "entries_insert_own"
  on public.entries for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "entries_delete_own"
  on public.entries for delete
  to authenticated
  using (auth.uid() = user_id);

-- Realtime (optional). Ignore error if already added.
do $$
begin
  alter publication supabase_realtime add table public.entries;
exception
  when duplicate_object then null;
end $$;
