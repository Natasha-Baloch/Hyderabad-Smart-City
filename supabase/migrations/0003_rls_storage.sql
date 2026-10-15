-- Row Level Security. Default deny: every table enabled, explicit policies only.
alter table public.profiles enable row level security;
alter table public.city_areas enable row level security;
alter table public.city_assets enable row level security;
alter table public.sensor_readings enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_updates enable row level security;
alter table public.incident_assignments enable row level security;
alter table public.notifications enable row level security;
alter table public.scenarios enable row level security;
alter table public.scenario_results enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: read own; municipal/oversight read names of staff; update own display_name only (role guarded by trigger).
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_select_staff on public.profiles for select to authenticated
  using ((public.is_municipal() or public.is_oversight()) and role <> 'citizen');
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- no INSERT policy (trigger creates profiles) and no DELETE policy.

-- areas / assets: readable by any signed-in user; writes by mayor/admin only.
create policy areas_read on public.city_areas for select to authenticated using (true);
create policy areas_write on public.city_areas for all to authenticated
  using (public.current_role_name() in ('mayor','system_admin')) with check (public.current_role_name() in ('mayor','system_admin'));
create policy assets_read on public.city_assets for select to authenticated using (true);
create policy assets_write on public.city_assets for all to authenticated
  using (public.current_role_name() in ('mayor','system_admin')) with check (public.current_role_name() in ('mayor','system_admin'));

create policy sensors_read on public.sensor_readings for select to authenticated using (public.is_municipal() or public.is_oversight());
create policy sensors_write on public.sensor_readings for insert to authenticated with check (public.current_role_name() in ('mayor','system_admin'));

-- incidents: citizens see only their own; municipal & oversight see all. Inserts must be own. No direct updates/deletes.
create policy incidents_select on public.incidents for select to authenticated
  using (reporter_id = auth.uid() or public.is_municipal() or public.is_oversight());
create policy incidents_insert on public.incidents for insert to authenticated
  with check (reporter_id = auth.uid() and public.current_role_name() is not null);

-- incident_updates: citizens see non-internal rows on their own incidents; municipal see all; oversight see non-internal.
create policy updates_select on public.incident_updates for select to authenticated using (
  public.is_municipal()
  or (not is_internal and (public.is_oversight() or exists (select 1 from public.incidents i where i.id = incident_id and i.reporter_id = auth.uid())))
);
-- writes happen only via security-definer functions/triggers.

create policy assignments_select on public.incident_assignments for select to authenticated using (public.is_municipal() or public.is_oversight());

-- notifications: strictly own.
create policy notif_select on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy notif_update on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
revoke update on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;

-- scenarios: creator or municipal/oversight read; municipal create.
create policy scen_select on public.scenarios for select to authenticated using (created_by = auth.uid() or public.is_municipal() or public.is_oversight());
create policy scen_insert on public.scenarios for insert to authenticated with check (created_by = auth.uid() and public.is_municipal());
create policy scenres_select on public.scenario_results for select to authenticated using (exists (select 1 from public.scenarios s where s.id = scenario_id));
create policy scenres_insert on public.scenario_results for insert to authenticated
  with check (exists (select 1 from public.scenarios s where s.id = scenario_id and s.created_by = auth.uid()));

-- audit: mayor/admin/oversight read; no client writes.
create policy audit_select on public.audit_logs for select to authenticated
  using (public.current_role_name() in ('mayor','system_admin','chief_minister'));

-- Defence in depth: anon gets nothing.
revoke all on all tables in schema public from anon;
revoke insert, update, delete on public.incident_updates, public.incident_assignments, public.audit_logs from authenticated;

-- Realtime for notifications & incidents (RLS still applies to subscribers).
alter publication supabase_realtime add table public.notifications, public.incidents;

-- Private storage bucket for complaint photos: path = <reporter uuid>/<file>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('complaint-photos','complaint-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'complaint-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_select on storage.objects for select to authenticated
  using (bucket_id = 'complaint-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_municipal()));
