-- Coalesce viewer-driven World Cup result refreshes across all app instances.

create table if not exists public.public_result_refresh_leases (
  pool_slug text primary key,
  next_refresh_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.public_result_refresh_leases enable row level security;

create or replace function public.claim_public_result_refresh(
  p_pool_slug text,
  p_min_interval_seconds int
)
returns table(claimed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  if p_pool_slug is null or length(trim(p_pool_slug)) = 0 then
    raise exception 'Pool slug is required.';
  end if;

  if p_min_interval_seconds <= 0 then
    raise exception 'Refresh interval must be positive.';
  end if;

  claimed := false;

  insert into public.public_result_refresh_leases (
    pool_slug,
    next_refresh_at,
    updated_at
  )
  values (
    p_pool_slug,
    v_now + make_interval(secs => p_min_interval_seconds),
    v_now
  )
  on conflict (pool_slug) do update
  set
    next_refresh_at = v_now + make_interval(secs => p_min_interval_seconds),
    updated_at = v_now
  where public.public_result_refresh_leases.next_refresh_at <= v_now
  returning true into claimed;

  return next;
end;
$$;

revoke all on public.public_result_refresh_leases from anon;
revoke all on public.public_result_refresh_leases from authenticated;
revoke all on public.public_result_refresh_leases from public;
revoke all on function public.claim_public_result_refresh(text, int) from public;

grant all on public.public_result_refresh_leases to service_role;
grant execute on function public.claim_public_result_refresh(text, int) to service_role;
