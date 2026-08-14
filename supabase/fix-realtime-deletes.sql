-- Run once in Supabase SQL Editor if −1 does not sync live to other devices.
alter table public.entries replica identity full;
