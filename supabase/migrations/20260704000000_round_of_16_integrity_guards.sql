-- Integrity guards for Round of 16 submission and scoring flows.

create unique index if not exists entries_pool_normalized_email_idx
  on public.entries (
    pool_id,
    lower(
      coalesce(
        metadata ->> 'guestEmail',
        metadata ->> 'entryEmail',
        metadata ->> 'inviteEmail'
      )
    )
  )
  where coalesce(
    metadata ->> 'guestEmail',
    metadata ->> 'entryEmail',
    metadata ->> 'inviteEmail'
  ) is not null;

create or replace function public.replace_round_of_16_score_snapshot(
  p_pool_id uuid,
  p_entry_ids uuid[],
  p_breakdowns jsonb,
  p_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.score_breakdowns
  where entry_id = any(p_entry_ids);

  insert into public.score_breakdowns (
    entry_id,
    entry_pick_item_id,
    points_awarded,
    max_points,
    reason
  )
  select
    breakdown.entry_id,
    breakdown.entry_pick_item_id,
    breakdown.points_awarded,
    breakdown.max_points,
    breakdown.reason
  from jsonb_to_recordset(coalesce(p_breakdowns, '[]'::jsonb)) as breakdown(
    entry_id uuid,
    entry_pick_item_id uuid,
    points_awarded numeric,
    max_points numeric,
    reason text
  );

  insert into public.standings_snapshots (pool_id, rows)
  values (p_pool_id, coalesce(p_rows, '[]'::jsonb));
end;
$$;

revoke all on function public.replace_round_of_16_score_snapshot(
  uuid,
  uuid[],
  jsonb,
  jsonb
) from public;

grant execute on function public.replace_round_of_16_score_snapshot(
  uuid,
  uuid[],
  jsonb,
  jsonb
) to service_role;
