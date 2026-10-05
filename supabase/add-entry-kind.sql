-- Add cha7et kind to entries. Run in Supabase → SQL Editor.
-- Safe to re-run.

alter table public.entries
  add column if not exists kind text not null default 'na3';

alter table public.entries
  drop constraint if exists entries_kind_check;

alter table public.entries
  add constraint entries_kind_check
  check (kind in ('na3', 'cha7et'));

create index if not exists entries_user_kind_logged_at_idx
  on public.entries (user_id, kind, logged_at desc);
