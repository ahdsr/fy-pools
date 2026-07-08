-- Fix PL/pgSQL ambiguity in the Round of 16 submission RPC.
-- The output column `entry_id` can shadow the entry_picks column name inside
-- an `on conflict (entry_id, template_version_id)` target, so use the named
-- unique constraint instead.

create or replace function public.submit_round_of_16_picks_transaction(
  p_pool_id uuid,
  p_user_id uuid,
  p_template_version_id uuid,
  p_invite_id uuid,
  p_accept_invite boolean,
  p_display_name text,
  p_entry_number int,
  p_entry_metadata jsonb,
  p_submitted_at timestamptz,
  p_pick_items jsonb,
  p_invite_code text
)
returns table(entry_id uuid, entry_pick_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_entry_pick_id uuid;
  v_existing_pick_status public.pick_status;
  v_pool_owner_id uuid;
  v_pool_name text;
  v_pool_template_version_id uuid;
  v_pick_item_count int;
begin
  select pools.owner_id, pools.name, pools.template_version_id
  into v_pool_owner_id, v_pool_name, v_pool_template_version_id
  from public.pools
  where pools.id = p_pool_id;

  if not found then
    raise exception 'Pool not found.';
  end if;

  if v_pool_template_version_id <> p_template_version_id then
    raise exception 'Pool template does not match submission template.';
  end if;

  select count(*) into v_pick_item_count
  from jsonb_to_recordset(coalesce(p_pick_items, '[]'::jsonb)) as pick_item(
    template_pick_field_id uuid,
    pick_type text,
    value jsonb
  );

  if v_pick_item_count = 0 then
    raise exception 'Submitted picks are empty.';
  end if;

  insert into public.pool_members (pool_id, user_id, role)
  values (p_pool_id, p_user_id, 'player')
  on conflict (pool_id, user_id) do nothing;

  if p_accept_invite then
    update public.pool_invites
    set
      status = 'accepted',
      accepted_by = p_user_id,
      accepted_at = p_submitted_at
    where
      id = p_invite_id
      and pool_id = p_pool_id
      and (
        status <> 'accepted'
        or accepted_by is null
        or accepted_by = p_user_id
      );

    if not found then
      raise exception 'Invite could not be accepted.';
    end if;
  elsif not exists (
    select 1
    from public.pool_invites
    where
      id = p_invite_id
      and pool_id = p_pool_id
      and email is null
      and status = 'pending'
  ) then
    raise exception 'Signup invite is not available.';
  end if;

  insert into public.entries (
    pool_id,
    user_id,
    display_name,
    entry_number,
    metadata
  )
  values (
    p_pool_id,
    p_user_id,
    p_display_name,
    p_entry_number,
    coalesce(p_entry_metadata, '{}'::jsonb)
  )
  on conflict (pool_id, user_id, entry_number) do update
  set
    display_name = excluded.display_name,
    metadata = excluded.metadata
  returning public.entries.id into v_entry_id;

  select public.entry_picks.status
  into v_existing_pick_status
  from public.entry_picks
  where
    public.entry_picks.entry_id = v_entry_id
    and public.entry_picks.template_version_id = p_template_version_id;

  if v_existing_pick_status = 'locked' then
    raise exception 'Your picks are locked.';
  end if;

  insert into public.entry_picks (
    entry_id,
    template_version_id,
    status,
    submitted_at,
    updated_at
  )
  values (
    v_entry_id,
    p_template_version_id,
    'submitted',
    p_submitted_at,
    p_submitted_at
  )
  on conflict on constraint entry_picks_entry_id_template_version_id_key
  do update
  set
    status = 'submitted',
    submitted_at = excluded.submitted_at,
    updated_at = excluded.updated_at
  returning public.entry_picks.id into v_entry_pick_id;

  insert into public.entry_pick_items (
    entry_pick_id,
    template_pick_field_id,
    pick_type,
    value,
    submitted_at,
    updated_at
  )
  select
    v_entry_pick_id,
    pick_item.template_pick_field_id,
    pick_item.pick_type::public.pick_type,
    pick_item.value,
    p_submitted_at,
    p_submitted_at
  from jsonb_to_recordset(coalesce(p_pick_items, '[]'::jsonb)) as pick_item(
    template_pick_field_id uuid,
    pick_type text,
    value jsonb
  )
  on conflict (entry_pick_id, template_pick_field_id) do update
  set
    pick_type = excluded.pick_type,
    value = excluded.value,
    submitted_at = excluded.submitted_at,
    updated_at = excluded.updated_at;

  insert into public.commissioner_notifications (
    pool_id,
    recipient_id,
    actor_id,
    event_type,
    title,
    body,
    metadata
  )
  values (
    p_pool_id,
    v_pool_owner_id,
    p_user_id,
    'entry_submitted',
    'Entry submitted',
    p_display_name || ' submitted picks for ' || v_pool_name || '.',
    jsonb_build_object(
      'entryId', v_entry_id,
      'entryPickId', v_entry_pick_id,
      'inviteCode', p_invite_code
    )
  );

  entry_id := v_entry_id;
  entry_pick_id := v_entry_pick_id;
  return next;
end;
$$;

revoke all on function public.submit_round_of_16_picks_transaction(
  uuid,
  uuid,
  uuid,
  uuid,
  boolean,
  text,
  int,
  jsonb,
  timestamptz,
  jsonb,
  text
) from public;

grant execute on function public.submit_round_of_16_picks_transaction(
  uuid,
  uuid,
  uuid,
  uuid,
  boolean,
  text,
  int,
  jsonb,
  timestamptz,
  jsonb,
  text
) to service_role;
