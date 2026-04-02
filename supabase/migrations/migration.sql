-- Push subscription storage for Owed bill reminders
-- Run this in your Supabase SQL editor

create table if not exists push_subscriptions (
  id          uuid        primary key default gen_random_uuid(),
  endpoint    text        not null unique,
  p256dh      text        not null,
  auth        text        not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for fast endpoint lookups
create index if not exists push_subscriptions_endpoint_idx
  on push_subscriptions (endpoint);

-- Auto-update updated_at on row changes
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger push_subscriptions_updated_at
  before update on push_subscriptions
  for each row execute function update_updated_at();

-- RLS: only the service role can read (for the cron job)
-- The anon key can only insert/delete its own subscription
alter table push_subscriptions enable row level security;

create policy "Anyone can subscribe"
  on push_subscriptions for insert
  with check (true);

create policy "Anyone can unsubscribe by endpoint"
  on push_subscriptions for delete
  using (true);

create policy "Service role can read all"
  on push_subscriptions for select
  using (auth.role() = 'service_role');


-- Bills table: stores each device's bill list keyed by push endpoint
-- so the cron job knows what to remind each subscriber about
create table if not exists bills (
  id          uuid        primary key default gen_random_uuid(),
  endpoint    text        not null unique references push_subscriptions(endpoint) on delete cascade,
  data        jsonb       not null default '[]',
  updated_at  timestamptz not null default now()
);

create trigger bills_updated_at
  before update on bills
  for each row execute function update_updated_at();

alter table bills enable row level security;

create policy "Anyone can upsert bills by endpoint"
  on bills for insert with check (true);

create policy "Anyone can update bills by endpoint"
  on bills for update using (true);

create policy "Service role can read all bills"
  on bills for select using (auth.role() = 'service_role');