-- Helper functions, triggers and workflow RPCs.

create or replace function public.current_role_name() returns public.app_role
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() and account_status = 'active' $$;

create or replace function public.is_municipal() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.current_role_name() in ('municipal_staff','mayor','system_admin'), false) $$;

create or replace function public.is_oversight() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.current_role_name() in ('chief_minister','system_admin'), false) $$;

revoke all on function public.current_role_name(), public.is_municipal(), public.is_oversight() from public;
grant execute on function public.current_role_name(), public.is_municipal(), public.is_oversight() to authenticated;

-- New auth user => profile with role 'citizen' ALWAYS (client metadata is ignored for role).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Block self-service role/status changes. Only service_role / SQL editor (auth.uid() is null) or system_admin may change them.
create or replace function public.guard_profile_privileges() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.account_status is distinct from old.account_status
      or new.department is distinct from old.department) then
    if auth.uid() is not null and coalesce(public.current_role_name() <> 'system_admin', true) then
      raise exception 'Not permitted to change role, status or department' using errcode = '42501';
    end if;
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- Citizens cannot set workflow fields on insert; force safe defaults.
create or replace function public.incident_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.reporter_id := auth.uid();
  new.status := 'Submitted';
  new.assigned_to := null; new.assigned_department := null;
  new.reviewed_at := null; new.resolved_at := null;
  new.is_demo := false;
  return new;
end $$;
create trigger incidents_before_insert before insert on public.incidents
  for each row execute function public.incident_before_insert();

-- After insert: first history row + notify all active municipal recipients (mayor/staff).
create or replace function public.incident_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.incident_updates (incident_id, actor_id, kind, to_status, message)
  values (new.id, new.reporter_id, 'status_change', 'Submitted', 'Complaint submitted');
  insert into public.notifications (recipient_id, type, incident_id, title, body)
  select p.id, 'complaint_submitted', new.id, 'New complaint ' || new.complaint_no, new.title
  from public.profiles p where p.role in ('mayor','municipal_staff') and p.account_status = 'active';
  return new;
end $$;
create trigger incidents_after_insert after insert on public.incidents
  for each row execute function public.incident_after_insert();

-- Only RPCs below may change workflow columns; direct UPDATE by non-admins is rejected.
create or replace function public.incident_guard_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if current_setting('app.workflow_rpc', true) is distinct from 'on' and auth.uid() is not null then
    raise exception 'Use workflow functions to modify incidents' using errcode = '42501';
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger incidents_guard before update on public.incidents
  for each row execute function public.incident_guard_update();

-- Controlled workflow.
create or replace function public.transition_incident(p_incident uuid, p_to public.incident_status, p_public_message text default null, p_internal_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare cur public.incident_status; rep uuid; role_n public.app_role; ok boolean;
begin
  role_n := public.current_role_name();
  if role_n is null or role_n not in ('mayor','municipal_staff','system_admin') then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  select status, reporter_id into cur, rep from public.incidents where id = p_incident for update;
  if not found then raise exception 'Incident not found'; end if;
  ok := (cur,p_to) in (
    ('Submitted','Under Review'),('Under Review','Assigned'),('Assigned','In Progress'),
    ('In Progress','Resolved'),('Resolved','Reopened'),('Reopened','Under Review'));
  if not ok then raise exception 'Invalid transition % -> %', cur, p_to; end if;
  if p_to = 'Reopened' and coalesce(trim(p_public_message), trim(p_internal_note), '') = '' then
    raise exception 'A justification is required to reopen a complaint';
  end if;
  if p_to = 'Assigned' and not exists (select 1 from public.incident_assignments where incident_id = p_incident) then
    raise exception 'Assign the complaint before moving to Assigned';
  end if;
  perform set_config('app.workflow_rpc','on',true);
  update public.incidents set status = p_to,
    reviewed_at = case when p_to = 'Under Review' then coalesce(reviewed_at, now()) else reviewed_at end,
    resolved_at = case when p_to = 'Resolved' then now() when p_to = 'Reopened' then null else resolved_at end
  where id = p_incident;
  insert into public.incident_updates (incident_id, actor_id, kind, from_status, to_status, message)
  values (p_incident, auth.uid(), case when p_to='Resolved' then 'resolution' else 'status_change' end, cur, p_to, p_public_message);
  if coalesce(trim(p_internal_note),'') <> '' then
    insert into public.incident_updates (incident_id, actor_id, kind, message, is_internal)
    values (p_incident, auth.uid(), 'internal_note', p_internal_note, true);
  end if;
  insert into public.notifications (recipient_id, type, incident_id, title, body)
  values (rep, case when p_to='Resolved' then 'complaint_resolved' else 'status_changed' end, p_incident,
          'Complaint status: ' || p_to, p_public_message);
  insert into public.audit_logs (actor_id, action, target_table, target_id, detail)
  values (auth.uid(), 'incident.transition', 'incidents', p_incident::text, jsonb_build_object('from',cur,'to',p_to));
end $$;

create or replace function public.assign_incident(p_incident uuid, p_department text, p_assignee uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_municipal() then raise exception 'Not authorised' using errcode = '42501'; end if;
  if p_department is null and p_assignee is null then raise exception 'Department or assignee required'; end if;
  if p_assignee is not null and not exists (select 1 from public.profiles where id = p_assignee and role in ('municipal_staff','mayor') and account_status='active') then
    raise exception 'Assignee must be active municipal staff';
  end if;
  perform set_config('app.workflow_rpc','on',true);
  update public.incidents set assigned_department = p_department, assigned_to = p_assignee where id = p_incident;
  insert into public.incident_assignments (incident_id, department, assignee_id, assigned_by) values (p_incident, p_department, p_assignee, auth.uid());
  if p_assignee is not null then
    insert into public.notifications (recipient_id, type, incident_id, title, body)
    values (p_assignee, 'complaint_assigned', p_incident, 'Complaint assigned to you', p_department);
  end if;
  insert into public.audit_logs (actor_id, action, target_table, target_id, detail)
  values (auth.uid(), 'incident.assign', 'incidents', p_incident::text, jsonb_build_object('department',p_department,'assignee',p_assignee));
end $$;

create or replace function public.add_incident_note(p_incident uuid, p_message text, p_internal boolean)
returns void language plpgsql security definer set search_path = public as $$
declare rep uuid;
begin
  if not public.is_municipal() then raise exception 'Not authorised' using errcode = '42501'; end if;
  if coalesce(trim(p_message),'') = '' then raise exception 'Message required'; end if;
  select reporter_id into rep from public.incidents where id = p_incident;
  insert into public.incident_updates (incident_id, actor_id, kind, message, is_internal)
  values (p_incident, auth.uid(), case when p_internal then 'internal_note' else 'public_update' end, p_message, p_internal);
  if not p_internal then
    insert into public.notifications (recipient_id, type, incident_id, title, body) values (rep,'status_changed',p_incident,'New update on your complaint',p_message);
  end if;
end $$;

-- Aggregates for dashboards (no PII). Municipal + oversight only.
create or replace function public.incident_stats(p_from timestamptz default null, p_to timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_municipal() or public.is_oversight()) then raise exception 'Not authorised' using errcode='42501'; end if;
  return (select jsonb_build_object(
    'total', count(*),
    'open', count(*) filter (where status <> 'Resolved'),
    'urgent', count(*) filter (where severity in ('High','Critical') and status <> 'Resolved'),
    'resolved', count(*) filter (where status = 'Resolved'),
    'avg_response_hours', round((avg(extract(epoch from (reviewed_at - created_at))/3600) filter (where reviewed_at is not null))::numeric, 2),
    'avg_resolution_hours', round((avg(extract(epoch from (resolved_at - created_at))/3600) filter (where resolved_at is not null))::numeric, 2),
    'by_category', coalesce((select jsonb_object_agg(category, n) from (select category, count(*) n from public.incidents i2 where (p_from is null or i2.created_at >= p_from) and (p_to is null or i2.created_at <= p_to) group by 1) c), '{}'),
    'by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.incidents i2 where (p_from is null or i2.created_at >= p_from) and (p_to is null or i2.created_at <= p_to) group by 1) c), '{}'),
    'by_severity', coalesce((select jsonb_object_agg(severity, n) from (select severity, count(*) n from public.incidents i2 where (p_from is null or i2.created_at >= p_from) and (p_to is null or i2.created_at <= p_to) group by 1) c), '{}'),
    'by_department', coalesce((select jsonb_object_agg(coalesce(assigned_department,'Unassigned'), n) from (select assigned_department, count(*) n from public.incidents i2 where (p_from is null or i2.created_at >= p_from) and (p_to is null or i2.created_at <= p_to) group by 1) c), '{}')
  ) from public.incidents i where (p_from is null or i.created_at >= p_from) and (p_to is null or i.created_at <= p_to));
end $$;

-- Public, PII-free incident feed (no reporter, no description, coarse data only).
create or replace view public.public_incidents with (security_invoker = off) as
  select complaint_no, category, severity, status, lat, lng, created_at, resolved_at from public.incidents where is_demo = false;
revoke all on public.public_incidents from anon, authenticated;
grant select on public.public_incidents to authenticated;

revoke all on function public.transition_incident, public.assign_incident, public.add_incident_note, public.incident_stats from public;
grant execute on function public.transition_incident, public.assign_incident, public.add_incident_note, public.incident_stats to authenticated;
