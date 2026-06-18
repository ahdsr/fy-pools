-- FY Pools foundation schema draft.
-- This is intentionally broad enough for template-driven sports pools while
-- keeping core product entities relational and flexible pick payloads in jsonb.

create extension if not exists pgcrypto;

create type member_role as enum ('owner', 'commissioner', 'player');
create type invite_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type pool_status as enum ('draft', 'open', 'locked', 'completed', 'archived');
create type pick_status as enum ('draft', 'submitted', 'locked');
create type lock_scope as enum ('pool', 'stage', 'match', 'field');
create type pick_type as enum (
  'group_rank',
  'group_advancer',
  'bracket_winner',
  'series_score',
  'match_score',
  'champion',
  'runner_up',
  'third_place',
  'numeric_bonus',
  'team_bonus',
  'text_bonus'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sports (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports(id) on delete restrict,
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  slug text not null,
  name text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  unique (competition_id, slug)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports(id) on delete restrict,
  slug text not null,
  name text not null,
  short_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (sport_id, slug)
);

create table public.competition_teams (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  primary key (competition_id, team_id)
);

create table public.template_versions (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid references public.sports(id) on delete restrict,
  slug text not null,
  name text not null,
  version int not null default 1,
  description text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (slug, version)
);

create table public.template_stages (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.template_versions(id) on delete cascade,
  key text not null,
  name text not null,
  sort_order int not null,
  config jsonb not null default '{}'::jsonb,
  unique (template_version_id, key)
);

create table public.template_pick_fields (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.template_versions(id) on delete cascade,
  template_stage_id uuid references public.template_stages(id) on delete cascade,
  key text not null,
  label text not null,
  pick_type pick_type not null,
  required boolean not null default true,
  sort_order int not null default 0,
  config jsonb not null default '{}'::jsonb,
  unique (template_version_id, key)
);

create table public.template_scoring_rules (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.template_versions(id) on delete cascade,
  template_stage_id uuid references public.template_stages(id) on delete cascade,
  key text not null,
  label text not null,
  points numeric(8, 2) not null,
  config jsonb not null default '{}'::jsonb,
  unique (template_version_id, key)
);

create table public.template_bonus_questions (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.template_versions(id) on delete cascade,
  key text not null,
  label text not null,
  pick_type pick_type not null,
  points numeric(8, 2) not null default 0,
  config jsonb not null default '{}'::jsonb,
  unique (template_version_id, key)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  template_version_id uuid references public.template_versions(id) on delete restrict,
  slug text not null,
  name text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (season_id, slug)
);

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  template_stage_id uuid references public.template_stages(id) on delete set null,
  key text not null,
  name text not null,
  sort_order int not null,
  starts_at timestamptz,
  ends_at timestamptz,
  unique (event_id, key)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete cascade,
  key text not null,
  name text not null,
  sort_order int not null default 0,
  unique (event_id, key)
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  seed int,
  primary key (group_id, team_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  external_id text,
  match_key text not null,
  home_team_id uuid references public.teams(id) on delete set null,
  away_team_id uuid references public.teams(id) on delete set null,
  starts_at timestamptz,
  status text not null default 'scheduled',
  result jsonb not null default '{}'::jsonb,
  unique (event_id, match_key)
);

create table public.series (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete set null,
  series_key text not null,
  team_a_id uuid references public.teams(id) on delete set null,
  team_b_id uuid references public.teams(id) on delete set null,
  best_of int,
  result jsonb not null default '{}'::jsonb,
  unique (event_id, series_key)
);

create table public.bracket_slots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete set null,
  slot_key text not null,
  source_label text,
  team_id uuid references public.teams(id) on delete set null,
  config jsonb not null default '{}'::jsonb,
  unique (event_id, slot_key)
);

create table public.pools (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  event_id uuid references public.events(id) on delete restrict,
  template_version_id uuid not null references public.template_versions(id) on delete restrict,
  slug text not null unique,
  name text not null,
  status pool_status not null default 'draft',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pool_members (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role member_role not null default 'player',
  joined_at timestamptz not null default now(),
  unique (pool_id, user_id)
);

create table public.pool_invites (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  email text,
  code text not null unique,
  status invite_status not null default 'pending',
  expires_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  entry_number int not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (pool_id, user_id, entry_number)
);

create table public.entry_picks (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  template_version_id uuid not null references public.template_versions(id) on delete restrict,
  status pick_status not null default 'draft',
  submitted_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entry_id, template_version_id)
);

create table public.entry_pick_items (
  id uuid primary key default gen_random_uuid(),
  entry_pick_id uuid not null references public.entry_picks(id) on delete cascade,
  template_pick_field_id uuid not null references public.template_pick_fields(id) on delete restrict,
  stage_id uuid references public.stages(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  series_id uuid references public.series(id) on delete set null,
  bracket_slot_id uuid references public.bracket_slots(id) on delete set null,
  pick_type pick_type not null,
  value jsonb not null,
  submitted_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entry_pick_id, template_pick_field_id)
);

create table public.results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  source text not null,
  source_ref text,
  payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create table public.result_outcomes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete set null,
  match_id uuid references public.matches(id) on delete cascade,
  series_id uuid references public.series(id) on delete cascade,
  outcome_key text not null,
  value jsonb not null,
  decided_at timestamptz,
  unique (event_id, outcome_key)
);

create table public.score_breakdowns (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  entry_pick_item_id uuid references public.entry_pick_items(id) on delete set null,
  template_scoring_rule_id uuid references public.template_scoring_rules(id) on delete set null,
  points_awarded numeric(8, 2) not null default 0,
  max_points numeric(8, 2) not null default 0,
  reason text not null,
  calculated_at timestamptz not null default now()
);

create table public.standings_snapshots (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  calculated_at timestamptz not null default now(),
  rows jsonb not null default '[]'::jsonb
);

create table public.lock_rules (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  scope lock_scope not null,
  stage_id uuid references public.stages(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  template_pick_field_id uuid references public.template_pick_fields(id) on delete cascade,
  locks_at timestamptz not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid references public.pools(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.payout_rules (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  place int not null,
  label text not null,
  amount_label text,
  percentage numeric(5, 2),
  unique (pool_id, place)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pool_id uuid references public.pools(id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'incomplete',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pool_members_user_id_idx on public.pool_members(user_id);
create index entries_pool_id_idx on public.entries(pool_id);
create index entry_pick_items_entry_pick_id_idx on public.entry_pick_items(entry_pick_id);
create index score_breakdowns_entry_id_idx on public.score_breakdowns(entry_id);
create index audit_events_pool_created_idx on public.audit_events(pool_id, created_at desc);
create index matches_event_stage_idx on public.matches(event_id, stage_id);

alter table public.profiles enable row level security;
alter table public.pools enable row level security;
alter table public.pool_members enable row level security;
alter table public.pool_invites enable row level security;
alter table public.entries enable row level security;
alter table public.entry_picks enable row level security;
alter table public.entry_pick_items enable row level security;
alter table public.score_breakdowns enable row level security;
alter table public.standings_snapshots enable row level security;
alter table public.audit_events enable row level security;

-- Detailed policies should be added with auth wiring. The intended model is:
-- owners and commissioners can administer their pools; players can read their
-- pool surfaces and mutate only their own unlocked picks.
