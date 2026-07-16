-- Enforce pool pick locks inside the database transaction. Application checks
-- improve the UI, but this guard is the final authority for submissions.

create or replace function public.round_of_16_parse_pool_time(
  p_value text,
  p_timezone text
)
returns timestamptz
language plpgsql
set search_path = pg_catalog
as $$
begin
  if p_value is null or length(trim(p_value)) = 0 then
    return null;
  end if;

  if p_value ~ '(Z|[+-][0-9]{2}:?[0-9]{2})$' then
    return p_value::timestamptz;
  end if;

  return p_value::timestamp at time zone p_timezone;
exception
  when others then
    raise exception 'Pool lock time is invalid.';
end;
$$;

create or replace function public.round_of_16_effective_pick_lock_at(
  p_settings jsonb
)
returns timestamptz
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_timezone text := coalesce(nullif(trim(p_settings #>> '{roundOf16,basics,timezone}'), ''), 'UTC');
  v_manual_cutoff timestamptz;
  v_event_start timestamptz;
  v_event_cutoff timestamptz;
  v_effective_cutoff timestamptz;
  v_buffer_minutes int := 0;
  v_buffer_value text := p_settings #>> '{roundOf16,basics,lockBeforeEventMinutes}';
  v_matchup jsonb;
begin
  if v_buffer_value is not null and length(trim(v_buffer_value)) > 0 then
    begin
      v_buffer_minutes := v_buffer_value::int;
    exception
      when others then
        raise exception 'Event lock buffer is invalid.';
    end;
  end if;

  if v_buffer_minutes < 0 or v_buffer_minutes > 10080 then
    raise exception 'Event lock buffer is outside the permitted range.';
  end if;

  v_manual_cutoff := public.round_of_16_parse_pool_time(
    p_settings #>> '{roundOf16,basics,picksLockAt}',
    v_timezone
  );
  if v_manual_cutoff is null then
    return null;
  end if;

  v_effective_cutoff := v_manual_cutoff;
  for v_matchup in
    select value
    from jsonb_array_elements(
      coalesce(p_settings #> '{roundOf16,matchups}', '[]'::jsonb)
    )
  loop
    v_event_start := public.round_of_16_parse_pool_time(
      v_matchup ->> 'startsAt',
      v_timezone
    );
    if v_event_start is not null then
      v_event_cutoff := v_event_start - make_interval(mins => v_buffer_minutes);
      if v_event_cutoff < v_effective_cutoff then
        v_effective_cutoff := v_event_cutoff;
      end if;
    end if;
  end loop;

  return v_effective_cutoff;
end;
$$;

revoke all on function public.round_of_16_parse_pool_time(text, text) from public;
revoke all on function public.round_of_16_effective_pick_lock_at(jsonb) from public;
grant execute on function public.round_of_16_parse_pool_time(text, text) to service_role;
grant execute on function public.round_of_16_effective_pick_lock_at(jsonb) to service_role;

create or replace function public.assert_round_of_16_pick_write_is_open(
  p_entry_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings jsonb;
  v_pick_lock_at timestamptz;
begin
  select pools.settings
  into v_settings
  from public.entries
  join public.pools on pools.id = entries.pool_id
  where entries.id = p_entry_id;

  if not found then
    raise exception 'Entry not found.';
  end if;

  v_pick_lock_at := public.round_of_16_effective_pick_lock_at(v_settings);
  if v_pick_lock_at is null or now() >= v_pick_lock_at then
    raise exception 'The pick deadline has passed.';
  end if;
end;
$$;

create or replace function public.enforce_round_of_16_entry_pick_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Commissioners may transition an already-submitted entry to locked after
  -- the cutoff, but no other entry-pick mutation may cross the boundary.
  if TG_OP = 'UPDATE' and NEW.status = 'locked' and OLD.status in ('submitted', 'locked') then
    return NEW;
  end if;

  perform public.assert_round_of_16_pick_write_is_open(
    case when TG_OP = 'DELETE' then OLD.entry_id else NEW.entry_id end
  );
  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$$;

create or replace function public.enforce_round_of_16_pick_item_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
begin
  select entry_picks.entry_id
  into v_entry_id
  from public.entry_picks
  where entry_picks.id = case
    when TG_OP = 'DELETE' then OLD.entry_pick_id
    else NEW.entry_pick_id
  end;

  perform public.assert_round_of_16_pick_write_is_open(v_entry_id);
  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$$;

drop trigger if exists enforce_round_of_16_entry_pick_lock on public.entry_picks;
create trigger enforce_round_of_16_entry_pick_lock
before insert or update or delete on public.entry_picks
for each row execute function public.enforce_round_of_16_entry_pick_lock();

drop trigger if exists enforce_round_of_16_pick_item_lock on public.entry_pick_items;
create trigger enforce_round_of_16_pick_item_lock
before insert or update or delete on public.entry_pick_items
for each row execute function public.enforce_round_of_16_pick_item_lock();

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
  v_pool_settings jsonb;
  v_pick_lock_at timestamptz;
  v_pick_item_count int;
begin
  select pools.owner_id, pools.name, pools.template_version_id, pools.settings
  into v_pool_owner_id, v_pool_name, v_pool_template_version_id, v_pool_settings
  from public.pools
  where pools.id = p_pool_id;

  if not found then
    raise exception 'Pool not found.';
  end if;

  if v_pool_template_version_id <> p_template_version_id then
    raise exception 'Pool template does not match submission template.';
  end if;

  v_pick_lock_at := public.round_of_16_effective_pick_lock_at(v_pool_settings);
  if v_pick_lock_at is null or now() >= v_pick_lock_at then
    raise exception 'The pick deadline has passed.';
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
  on conflict (entry_id, template_version_id) do update
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
