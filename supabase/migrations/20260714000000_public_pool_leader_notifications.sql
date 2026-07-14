-- Record and atomically claim public-pool lead-change emails. A source signature
-- is immutable for one FIFA result state, so it also makes refresh retries safe.

create table if not exists public.public_pool_leader_notification_deliveries (
  pool_slug text not null,
  entry_id text not null,
  source_signature text not null,
  leader_name text not null,
  leader_score numeric(8, 2) not null,
  recipient text not null,
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  last_error text,
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (pool_slug, entry_id, source_signature)
);

alter table public.public_pool_leader_notification_deliveries enable row level security;

create or replace function public.claim_public_pool_leader_notification(
  p_pool_slug text,
  p_entry_id text,
  p_source_signature text,
  p_leader_name text,
  p_leader_score numeric,
  p_recipient text
)
returns table(claimed boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(length(trim(p_pool_slug)), 0) = 0
    or coalesce(length(trim(p_entry_id)), 0) = 0
    or coalesce(length(trim(p_source_signature)), 0) = 0
    or coalesce(length(trim(p_recipient)), 0) = 0 then
    raise exception 'Pool, entry, source signature, and recipient are required.';
  end if;

  claimed := false;

  insert into public.public_pool_leader_notification_deliveries (
    pool_slug,
    entry_id,
    source_signature,
    leader_name,
    leader_score,
    recipient
  )
  values (
    p_pool_slug,
    p_entry_id,
    p_source_signature,
    p_leader_name,
    p_leader_score,
    p_recipient
  )
  on conflict (pool_slug, entry_id, source_signature) do update
  set
    leader_name = excluded.leader_name,
    leader_score = excluded.leader_score,
    recipient = excluded.recipient,
    delivery_status = 'pending',
    last_error = null,
    claimed_at = now(),
    updated_at = now()
  where public.public_pool_leader_notification_deliveries.delivery_status = 'failed'
  returning true into claimed;

  return next;
end;
$$;

revoke all on public.public_pool_leader_notification_deliveries from anon;
revoke all on public.public_pool_leader_notification_deliveries from authenticated;
revoke all on public.public_pool_leader_notification_deliveries from public;
revoke all on function public.claim_public_pool_leader_notification(text, text, text, text, numeric, text) from public;

grant all on public.public_pool_leader_notification_deliveries to service_role;
grant execute on function public.claim_public_pool_leader_notification(text, text, text, text, numeric, text) to service_role;
