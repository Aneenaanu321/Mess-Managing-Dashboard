-- Mess Manager — run once in Supabase → SQL Editor → New query → Run
-- Creates one table that stores the whole dashboard as JSON (simple + reliable)

create table if not exists public.app_data (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;

-- Allow the web app (anon key) to read/write.
-- OK for a private client link. Do not share the site URL publicly.
drop policy if exists "anon_read_write_app_data" on public.app_data;
create policy "anon_read_write_app_data"
  on public.app_data
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Optional starter rows (empty)
insert into public.app_data (id, payload)
values
  ('state', '{}'::jsonb),
  ('settings', '{}'::jsonb)
on conflict (id) do nothing;
