-- Close Supabase advisor rls_disabled_in_public findings.
--
-- The MVP serves app data through trusted server code using service_role.
-- Browser Supabase clients are only for auth/session state, so direct
-- anon/authenticated table access should be denied unless a future migration
-- adds a narrow policy and matching table grant for a specific client surface.

alter table public.sports enable row level security;
alter table public.competitions enable row level security;
alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.competition_teams enable row level security;
alter table public.template_versions enable row level security;
alter table public.template_stages enable row level security;
alter table public.template_pick_fields enable row level security;
alter table public.template_scoring_rules enable row level security;
alter table public.template_bonus_questions enable row level security;
alter table public.events enable row level security;
alter table public.stages enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.matches enable row level security;
alter table public.series enable row level security;
alter table public.bracket_slots enable row level security;
alter table public.results enable row level security;
alter table public.result_outcomes enable row level security;
alter table public.lock_rules enable row level security;
alter table public.payout_rules enable row level security;
alter table public.subscriptions enable row level security;

-- Repeat core app tables so production projects that received partial/manual
-- migrations still converge to the intended all-public-table RLS posture.
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
alter table public.commissioner_notifications enable row level security;

revoke all privileges on all tables in schema public from anon, authenticated;

alter default privileges in schema public
  revoke all privileges on tables from anon, authenticated;
