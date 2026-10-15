-- Database permission tests. Run in the Supabase SQL editor of a DEVELOPMENT project (it rolls back).
-- Each block must print "PASS"; a failure raises an exception.
begin;
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); m uuid := gen_random_uuid(); cm uuid := gen_random_uuid();
        inc uuid; n int;
begin
  insert into auth.users (id, email, instance_id, aud, role) values
    (a,'a@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
    (b,'b@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
    (m,'m@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
    (cm,'cm@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
  update public.profiles set role='mayor' where id = m;            -- provisioning (postgres, auth.uid() null)
  update public.profiles set role='chief_minister' where id = cm;

  -- Citizen A creates a complaint
  perform set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true);
  set local role authenticated;
  insert into public.incidents (title,description,category,severity,lat,lng) values ('Test','Test description','Roads','High',25.39,68.36) returning id into inc;

  -- 1. Citizen B cannot read A's complaint
  perform set_config('request.jwt.claims', json_build_object('sub',b,'role','authenticated')::text, true);
  select count(*) into n from public.incidents where id = inc;
  assert n = 0, 'FAIL: citizen B can read citizen A complaint'; raise notice 'PASS 1 citizen isolation';

  -- 2. Citizen cannot self-promote
  begin update public.profiles set role='mayor' where id = b; assert false, 'FAIL: self promotion allowed';
  exception when insufficient_privilege then raise notice 'PASS 2 self-promotion blocked'; end;

  -- 3. Citizen cannot resolve or assign
  begin perform public.transition_incident(inc,'Under Review'); assert false, 'FAIL: citizen transition';
  exception when insufficient_privilege then raise notice 'PASS 3a citizen cannot transition'; end;
  begin perform public.assign_incident(inc,'Roads & Works'); assert false, 'FAIL: citizen assign';
  exception when insufficient_privilege then raise notice 'PASS 3b citizen cannot assign'; end;

  -- 4. Mayor can see, assign and transition; invalid jump is rejected
  perform set_config('request.jwt.claims', json_build_object('sub',m,'role','authenticated')::text, true);
  select count(*) into n from public.incidents where id = inc; assert n = 1, 'FAIL: mayor cannot read';
  perform public.transition_incident(inc,'Under Review','Reviewing');
  begin perform public.transition_incident(inc,'Resolved'); assert false, 'FAIL: skipped workflow';
  exception when others then raise notice 'PASS 4a workflow enforced'; end;
  perform public.assign_incident(inc,'Roads & Works');
  perform public.transition_incident(inc,'Assigned'); perform public.add_incident_note(inc,'secret note',true);
  raise notice 'PASS 4b mayor manages complaint';

  -- 5. Citizen A sees status history but NOT the internal note; has a notification
  perform set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true);
  select count(*) into n from public.incident_updates where incident_id = inc and is_internal; assert n = 0, 'FAIL: internal note leaked';
  select count(*) into n from public.notifications where recipient_id = a and type='status_changed'; assert n >= 1, 'FAIL: no persisted notification';
  raise notice 'PASS 5 internal notes hidden, notifications persisted';

  -- 6. Chief minister: can read aggregate stats, cannot modify
  perform set_config('request.jwt.claims', json_build_object('sub',cm,'role','authenticated')::text, true);
  assert (public.incident_stats() ->> 'total')::int >= 1, 'FAIL: oversight stats';
  begin perform public.transition_incident(inc,'In Progress'); assert false, 'FAIL: CM transition';
  exception when insufficient_privilege then raise notice 'PASS 6 oversight is read-only'; end;
  select count(*) into n from public.incident_updates where incident_id = inc and is_internal; assert n = 0, 'FAIL: CM sees internal notes';
  raise notice 'ALL PASS';
end $$;
rollback;
