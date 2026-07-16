-- Provider-neutral snapshots used to prepare event-backed pool setup.
-- These are server-managed data: direct browser table access remains disabled.

create table if not exists public.event_catalog_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  sport_slug text not null,
  competition_slug text not null,
  season_slug text not null,
  event_external_id text not null,
  event_payload jsonb not null,
  readiness text not null check (readiness in ('ready', 'provisional', 'unavailable')),
  source_signature text not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, event_external_id)
);

create index if not exists event_catalog_snapshots_lookup_idx
  on public.event_catalog_snapshots (competition_slug, season_slug, expires_at desc);

alter table public.event_catalog_snapshots enable row level security;

revoke all on public.event_catalog_snapshots from anon;
revoke all on public.event_catalog_snapshots from authenticated;
revoke all on public.event_catalog_snapshots from public;

grant all on public.event_catalog_snapshots to service_role;
