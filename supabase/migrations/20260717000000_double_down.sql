-- Non-redeemable, members-only late-race side game. Credits have no cash
-- value and are deliberately isolated from score_breakdowns and payout_rules.

create table public.double_down_accounts (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  pool_member_id uuid not null references public.pool_members(id) on delete cascade,
  chips_spent smallint not null default 0 check (chips_spent between 0 and 3),
  credits integer not null default 0 check (credits >= 0),
  correct_calls integer not null default 0 check (correct_calls >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pool_id, pool_member_id)
);

create table public.double_down_markets (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  match_id text not null,
  match_snapshot jsonb not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'open', 'locked', 'settled', 'cancelled')),
  available_outcomes jsonb not null,
  opens_at timestamptz not null,
  locks_at timestamptz not null,
  impact_summary text not null,
  eligible_member_ids jsonb not null default '[]'::jsonb,
  representative_entries jsonb not null default '{}'::jsonb,
  settlement_outcome text check (settlement_outcome in ('home', 'draw', 'away')),
  settlement_source_signature text,
  settled_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (locks_at > opens_at),
  check (jsonb_typeof(available_outcomes) = 'array'),
  unique (pool_id, match_id)
);

create table public.double_down_calls (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.double_down_markets(id) on delete cascade,
  pool_member_id uuid not null references public.pool_members(id) on delete cascade,
  outcome text not null check (outcome in ('home', 'draw', 'away')),
  credits_awarded integer not null default 0 check (credits_awarded in (0, 2)),
  settled_outcome text check (settled_outcome in ('home', 'draw', 'away')),
  placed_at timestamptz not null default now(),
  settled_at timestamptz,
  unique (market_id, pool_member_id)
);

create table public.double_down_engagement_events (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  market_id uuid not null references public.double_down_markets(id) on delete cascade,
  event_type text not null check (event_type in ('market_viewed', 'eligible_prompt_viewed', 'reveal_viewed', 'call_committed')),
  created_at timestamptz not null default now()
);

create index double_down_markets_pool_status_lock_idx
  on public.double_down_markets(pool_id, status, locks_at);
create index double_down_calls_market_idx on public.double_down_calls(market_id);
create index double_down_engagement_events_market_type_idx on public.double_down_engagement_events(market_id, event_type, created_at desc);

alter table public.double_down_accounts enable row level security;
alter table public.double_down_markets enable row level security;
alter table public.double_down_calls enable row level security;
alter table public.double_down_engagement_events enable row level security;
revoke all privileges on public.double_down_accounts, public.double_down_markets, public.double_down_calls, public.double_down_engagement_events from anon, authenticated;

create or replace function public.place_double_down_call(
  p_market_id uuid,
  p_user_id uuid,
  p_outcome text
) returns table(call_id uuid, chips_spent smallint, credits integer, correct_calls integer)
language plpgsql security definer set search_path = public as $$
declare
  v_market public.double_down_markets%rowtype;
  v_member_id uuid;
  v_account public.double_down_accounts%rowtype;
  v_call_id uuid;
  v_chips_spent smallint;
  v_credits integer;
  v_correct_calls integer;
begin
  select * into v_market from public.double_down_markets where id = p_market_id for update;
  if not found then raise exception 'Double Down market not found.'; end if;
  if v_market.status not in ('scheduled', 'open') or now() < v_market.opens_at or now() >= v_market.locks_at then
    raise exception 'This Double Down market is no longer open.';
  end if;
  if not exists (select 1 from jsonb_array_elements_text(v_market.available_outcomes) as outcome_value(value) where outcome_value.value = p_outcome) then
    raise exception 'Choose a valid match outcome.';
  end if;

  select id into v_member_id from public.pool_members where pool_id = v_market.pool_id and user_id = p_user_id;
  if not found or not exists (select 1 from jsonb_array_elements_text(v_market.eligible_member_ids) as eligible_value(value) where eligible_value.value = v_member_id::text) then
    raise exception 'You are not eligible for this Double Down market.';
  end if;

  insert into public.double_down_accounts(pool_id, pool_member_id)
    values(v_market.pool_id, v_member_id)
    on conflict(pool_id, pool_member_id) do nothing;
  select * into v_account from public.double_down_accounts
    where pool_id = v_market.pool_id and pool_member_id = v_member_id for update;
  if v_account.chips_spent >= 3 then raise exception 'You have used all three Double Down chips.'; end if;

  insert into public.double_down_calls(market_id, pool_member_id, outcome)
    values(p_market_id, v_member_id, p_outcome)
    returning id into v_call_id;
  update public.double_down_accounts
    set chips_spent = double_down_accounts.chips_spent + 1, updated_at = now()
    where id = v_account.id
    returning double_down_accounts.chips_spent, double_down_accounts.credits, double_down_accounts.correct_calls
    into v_chips_spent, v_credits, v_correct_calls;
  if v_market.status = 'scheduled' then update public.double_down_markets set status = 'open', updated_at = now() where id = v_market.id; end if;
  insert into public.audit_events(pool_id, actor_id, event_type, summary, metadata)
    values(v_market.pool_id, p_user_id, 'double_down.call_placed', 'Placed a Double Down call.', jsonb_build_object('marketId', p_market_id, 'outcome', p_outcome));
  call_id := v_call_id;
  chips_spent := v_chips_spent;
  credits := v_credits;
  correct_calls := v_correct_calls;
  return next;
exception when unique_violation then
  raise exception 'You have already committed a call for this market.';
end;
$$;

revoke all on function public.place_double_down_call(uuid, uuid, text) from public;
grant execute on function public.place_double_down_call(uuid, uuid, text) to service_role;

create or replace function public.cancel_double_down_chip(p_pool_id uuid, p_member_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.double_down_accounts
    set chips_spent = greatest(0, chips_spent - 1), updated_at = now()
    where pool_id = p_pool_id and pool_member_id = p_member_id;
end;
$$;

revoke all on function public.cancel_double_down_chip(uuid, uuid) from public;
grant execute on function public.cancel_double_down_chip(uuid, uuid) to service_role;
