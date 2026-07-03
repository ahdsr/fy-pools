-- Round of 16 participant links and commissioner notification MVP.

alter table public.pool_invites
  add column if not exists display_name text;

create table if not exists public.commissioner_notifications (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists commissioner_notifications_recipient_created_idx
  on public.commissioner_notifications(recipient_id, created_at desc);

create index if not exists pool_invites_pool_status_idx
  on public.pool_invites(pool_id, status);

alter table public.commissioner_notifications enable row level security;

-- App code performs writes through verified Server Actions. This read policy
-- keeps future direct client reads constrained to the notification recipient.
create policy "commissioners can read their notifications"
  on public.commissioner_notifications
  for select
  using (auth.uid() = recipient_id);
