-- Durable API rate-limit buckets for trusted server endpoints.

create table if not exists public.api_rate_limit_buckets (
  scope text not null,
  bucket_key text not null,
  count int not null default 0,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (scope, bucket_key)
);

create index if not exists api_rate_limit_buckets_expires_at_idx
  on public.api_rate_limit_buckets(expires_at);

alter table public.api_rate_limit_buckets enable row level security;

create or replace function public.consume_api_rate_limit(
  p_scope text,
  p_bucket_key text,
  p_window_seconds int,
  p_max_requests int
)
returns table(allowed boolean, retry_after_seconds int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count int;
  v_expires_at timestamptz;
begin
  if p_scope is null or length(trim(p_scope)) = 0 then
    raise exception 'Rate-limit scope is required.';
  end if;

  if p_bucket_key is null or length(trim(p_bucket_key)) = 0 then
    raise exception 'Rate-limit bucket key is required.';
  end if;

  if p_window_seconds <= 0 or p_max_requests <= 0 then
    raise exception 'Rate-limit window and maximum must be positive.';
  end if;

  delete from public.api_rate_limit_buckets
  where expires_at <= v_now - interval '5 minutes';

  insert into public.api_rate_limit_buckets (
    scope,
    bucket_key,
    count,
    expires_at,
    updated_at
  )
  values (
    p_scope,
    p_bucket_key,
    1,
    v_now + make_interval(secs => p_window_seconds),
    v_now
  )
  on conflict (scope, bucket_key) do update
  set
    count = case
      when public.api_rate_limit_buckets.expires_at <= v_now then 1
      else public.api_rate_limit_buckets.count + 1
    end,
    expires_at = case
      when public.api_rate_limit_buckets.expires_at <= v_now then v_now + make_interval(secs => p_window_seconds)
      else public.api_rate_limit_buckets.expires_at
    end,
    updated_at = v_now
  returning public.api_rate_limit_buckets.count,
    public.api_rate_limit_buckets.expires_at
  into v_count, v_expires_at;

  allowed := v_count <= p_max_requests;
  retry_after_seconds := greatest(
    1,
    ceil(extract(epoch from (v_expires_at - v_now)))::int
  );
  return next;
end;
$$;

revoke all on function public.consume_api_rate_limit(
  text,
  text,
  int,
  int
) from public;

grant execute on function public.consume_api_rate_limit(
  text,
  text,
  int,
  int
) to service_role;
