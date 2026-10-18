-- ValueDam Network Batch 1 database
-- Run this once in a fresh Supabase project.
create extension if not exists pgcrypto;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  email text not null,
  phone text,
  service_name text,
  budget text,
  details text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;
alter table public.service_requests enable row level security;

drop policy if exists "public can submit contact messages" on public.contact_messages;
create policy "public can submit contact messages" on public.contact_messages
for insert to anon, authenticated with check (true);

drop policy if exists "public can submit service requests" on public.service_requests;
create policy "public can submit service requests" on public.service_requests
for insert to anon, authenticated with check (true);

-- No public SELECT policy is created. Submitted messages/requests are not publicly readable.
