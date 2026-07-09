-- Durable public result snapshots for public pool score pages.

create table if not exists public.public_result_snapshots (
  pool_slug text primary key,
  results_payload jsonb not null default '{}'::jsonb,
  source text not null,
  source_signature text,
  fetched_at timestamptz not null default now(),
  status text not null default 'ok',
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.public_result_snapshots enable row level security;

revoke all on public.public_result_snapshots from anon;
revoke all on public.public_result_snapshots from authenticated;
revoke all on public.public_result_snapshots from public;

grant all on public.public_result_snapshots to service_role;
