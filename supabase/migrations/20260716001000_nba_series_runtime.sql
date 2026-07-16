-- Template-runtime lock dispatch and NBA Series Bracket submission support.

create or replace function public.nba_series_effective_pick_lock_at(p_settings jsonb)
returns timestamptz
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_timezone text := coalesce(nullif(trim(p_settings #>> '{nbaSeries,basics,timezone}'), ''), 'UTC');
  v_value text := p_settings #>> '{nbaSeries,basics,picksLockAt}';
begin
  if v_value is null or length(trim(v_value)) = 0 then return null; end if;
  if v_value ~ '(Z|[+-][0-9]{2}:?[0-9]{2})$' then return v_value::timestamptz; end if;
  return v_value::timestamp at time zone v_timezone;
exception when others then raise exception 'Pool lock time is invalid.';
end;
$$;

create or replace function public.assert_template_pick_write_is_open(p_entry_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_settings jsonb; v_pick_lock_at timestamptz;
begin
  select pools.settings into v_settings from public.entries join public.pools on pools.id = entries.pool_id where entries.id = p_entry_id;
  if not found then raise exception 'Entry not found.'; end if;
  if v_settings ? 'roundOf16' then
    v_pick_lock_at := public.round_of_16_effective_pick_lock_at(v_settings);
  elsif v_settings ? 'nbaSeries' then
    v_pick_lock_at := public.nba_series_effective_pick_lock_at(v_settings);
  else
    raise exception 'Pool template settings are not supported.';
  end if;
  if v_pick_lock_at is null or now() >= v_pick_lock_at then raise exception 'The pick deadline has passed.'; end if;
end;
$$;

create or replace function public.enforce_round_of_16_entry_pick_lock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'UPDATE' and NEW.status = 'locked' and OLD.status in ('submitted', 'locked') then return NEW; end if;
  perform public.assert_template_pick_write_is_open(case when TG_OP = 'DELETE' then OLD.entry_id else NEW.entry_id end);
  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$$;

create or replace function public.enforce_round_of_16_pick_item_lock()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_entry_id uuid;
begin
  select entry_picks.entry_id into v_entry_id from public.entry_picks where entry_picks.id = case when TG_OP = 'DELETE' then OLD.entry_pick_id else NEW.entry_pick_id end;
  perform public.assert_template_pick_write_is_open(v_entry_id);
  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$$;

create or replace function public.submit_nba_series_picks_transaction(
  p_pool_id uuid, p_user_id uuid, p_template_version_id uuid, p_invite_id uuid,
  p_accept_invite boolean, p_display_name text, p_entry_number int,
  p_entry_metadata jsonb, p_submitted_at timestamptz, p_pick_items jsonb, p_invite_code text
) returns table(entry_id uuid, entry_pick_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_entry_id uuid; v_entry_pick_id uuid; v_owner_id uuid; v_pool_name text; v_template_id uuid; v_settings jsonb; v_lock_at timestamptz; v_count int;
begin
  select owner_id, name, template_version_id, settings into v_owner_id, v_pool_name, v_template_id, v_settings from public.pools where id = p_pool_id;
  if not found then raise exception 'Pool not found.'; end if;
  if v_template_id <> p_template_version_id or not (v_settings ? 'nbaSeries') then raise exception 'Pool template does not match submission template.'; end if;
  v_lock_at := public.nba_series_effective_pick_lock_at(v_settings);
  if v_lock_at is null or now() >= v_lock_at then raise exception 'The pick deadline has passed.'; end if;
  select count(*) into v_count from jsonb_array_elements(coalesce(p_pick_items, '[]'::jsonb));
  if v_count = 0 then raise exception 'Submitted picks are empty.'; end if;
  insert into public.pool_members(pool_id,user_id,role) values(p_pool_id,p_user_id,'player') on conflict(pool_id,user_id) do nothing;
  if p_accept_invite then
    update public.pool_invites set status='accepted',accepted_by=p_user_id,accepted_at=p_submitted_at where id=p_invite_id and pool_id=p_pool_id and (status <> 'accepted' or accepted_by is null or accepted_by=p_user_id);
    if not found then raise exception 'Invite could not be accepted.'; end if;
  elsif not exists(select 1 from public.pool_invites where id=p_invite_id and pool_id=p_pool_id and email is null and status='pending') then raise exception 'Signup invite is not available.';
  end if;
  insert into public.entries(pool_id,user_id,display_name,entry_number,metadata) values(p_pool_id,p_user_id,p_display_name,p_entry_number,coalesce(p_entry_metadata,'{}'::jsonb))
    on conflict(pool_id,user_id,entry_number) do update set display_name=excluded.display_name,metadata=excluded.metadata returning id into v_entry_id;
  if exists(select 1 from public.entry_picks where entry_id=v_entry_id and template_version_id=p_template_version_id and status='locked') then raise exception 'Your picks are locked.'; end if;
  insert into public.entry_picks(entry_id,template_version_id,status,submitted_at,updated_at) values(v_entry_id,p_template_version_id,'submitted',p_submitted_at,p_submitted_at)
    on conflict(entry_id,template_version_id) do update set status='submitted',submitted_at=excluded.submitted_at,updated_at=excluded.updated_at returning id into v_entry_pick_id;
  insert into public.entry_pick_items(entry_pick_id,template_pick_field_id,pick_type,value,submitted_at,updated_at)
  select v_entry_pick_id,item.template_pick_field_id,item.pick_type::public.pick_type,item.value,p_submitted_at,p_submitted_at
  from jsonb_to_recordset(coalesce(p_pick_items,'[]'::jsonb)) as item(template_pick_field_id uuid,pick_type text,value jsonb)
  on conflict(entry_pick_id,template_pick_field_id) do update set pick_type=excluded.pick_type,value=excluded.value,submitted_at=excluded.submitted_at,updated_at=excluded.updated_at;
  insert into public.commissioner_notifications(pool_id,recipient_id,actor_id,event_type,title,body,metadata)
  values(p_pool_id,v_owner_id,p_user_id,'entry_submitted','Entry submitted',p_display_name || ' submitted picks for ' || v_pool_name || '.',jsonb_build_object('entryId',v_entry_id,'entryPickId',v_entry_pick_id,'inviteCode',p_invite_code));
  entry_id:=v_entry_id; entry_pick_id:=v_entry_pick_id; return next;
end;
$$;

create or replace function public.replace_template_score_snapshot(p_pool_id uuid,p_entry_ids uuid[],p_breakdowns jsonb,p_rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.score_breakdowns where entry_id = any(p_entry_ids);
  insert into public.score_breakdowns(entry_id,entry_pick_item_id,points_awarded,max_points,reason)
  select entry_id,entry_pick_item_id,points_awarded,max_points,reason from jsonb_to_recordset(coalesce(p_breakdowns,'[]'::jsonb)) as breakdown(entry_id uuid,entry_pick_item_id uuid,points_awarded numeric,max_points numeric,reason text);
  insert into public.standings_snapshots(pool_id,rows) values(p_pool_id,coalesce(p_rows,'[]'::jsonb));
end;
$$;

revoke all on function public.nba_series_effective_pick_lock_at(jsonb) from public;
revoke all on function public.assert_template_pick_write_is_open(uuid) from public;
revoke all on function public.submit_nba_series_picks_transaction(uuid,uuid,uuid,uuid,boolean,text,int,jsonb,timestamptz,jsonb,text) from public;
revoke all on function public.replace_template_score_snapshot(uuid,uuid[],jsonb,jsonb) from public;
grant execute on function public.nba_series_effective_pick_lock_at(jsonb) to service_role;
grant execute on function public.assert_template_pick_write_is_open(uuid) to service_role;
grant execute on function public.submit_nba_series_picks_transaction(uuid,uuid,uuid,uuid,boolean,text,int,jsonb,timestamptz,jsonb,text) to service_role;
grant execute on function public.replace_template_score_snapshot(uuid,uuid[],jsonb,jsonb) to service_role;
