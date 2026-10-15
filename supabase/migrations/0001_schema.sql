-- Hyderabad Smart City Digital Twin — core schema (PostgreSQL / Supabase)
create extension if not exists pgcrypto;

create type public.app_role as enum ('citizen','municipal_staff','mayor','chief_minister','system_admin');
create type public.incident_status as enum ('Submitted','Under Review','Assigned','In Progress','Resolved','Reopened');
create type public.incident_category as enum ('Roads','Water','Drainage','Electricity','Waste','Streetlights','Public Safety','Other');
create type public.severity as enum ('Low','Medium','High','Critical');
create type public.verification as enum ('sample','unverified','verified');

-- 1. profiles (role lives here; users cannot change it — see RLS + trigger)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  role public.app_role not null default 'citizen',
  department text,
  account_status text not null default 'active' check (account_status in ('active','suspended')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. city_areas
create table public.city_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  center_lat double precision check (center_lat between -90 and 90),
  center_lng double precision check (center_lng between -180 and 180),
  boundary jsonb,                       -- GeoJSON when available
  verification public.verification not null default 'unverified',
  source text,
  created_at timestamptz not null default now()
);

-- 3. city_assets
create table public.city_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('roads','education','healthcare','water','other')),
  asset_type text not null,
  area_id uuid references public.city_areas(id) on delete set null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  operational_status text not null default 'Operational' check (operational_status in ('Operational','Maintenance','Offline')),
  data_source text,
  verification public.verification not null default 'unverified',
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.city_assets (category);
create index on public.city_assets (area_id);

-- 4. sensor_readings
create table public.sensor_readings (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.city_assets(id) on delete cascade,
  metric text not null,
  value double precision not null,
  unit text not null,
  source text not null,
  is_simulated boolean not null default true,
  recorded_at timestamptz not null default now()
);
create index on public.sensor_readings (asset_id, recorded_at desc);

-- 5. incidents (private complaint records)
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  complaint_no text not null unique default ('HYD-' || to_char(now(),'YYYY') || '-' || lpad((floor(random()*1000000))::int::text, 6, '0')),
  reporter_id uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  title text not null check (char_length(title) between 3 and 150),
  description text not null check (char_length(description) between 5 and 4000),
  category public.incident_category not null,
  severity public.severity not null,
  address text,
  lat double precision not null check (lat between 24.5 and 26.5),   -- Hyderabad region sanity bound
  lng double precision not null check (lng between 67.5 and 69.5),
  area_id uuid references public.city_areas(id) on delete set null,
  status public.incident_status not null default 'Submitted',
  image_path text,                       -- path in private storage bucket
  assigned_department text,
  assigned_to uuid references public.profiles(id),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);
create index on public.incidents (reporter_id);
create index on public.incidents (status);
create index on public.incidents (category);
create index on public.incidents (created_at desc);

-- 6. incident_updates (status history, public updates, internal notes)
create table public.incident_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null default auth.uid(),
  kind text not null check (kind in ('status_change','public_update','internal_note','resolution')),
  from_status public.incident_status,
  to_status public.incident_status,
  message text,
  evidence_path text,
  is_internal boolean not null default false,
  created_at timestamptz not null default now(),
  check ((kind = 'internal_note') = is_internal)
);
create index on public.incident_updates (incident_id, created_at);

-- 7. incident_assignments
create table public.incident_assignments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  department text,
  assignee_id uuid references public.profiles(id),
  assigned_by uuid not null references public.profiles(id) default auth.uid(),
  assigned_at timestamptz not null default now(),
  check (department is not null or assignee_id is not null)
);
create index on public.incident_assignments (incident_id);

-- 8. notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('complaint_submitted','complaint_assigned','status_changed','complaint_resolved','system')),
  incident_id uuid references public.incidents(id) on delete cascade,
  title text not null,
  body text,
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.notifications (recipient_id, is_read, created_at desc);

-- 9/10. scenarios and results
create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  assumptions jsonb not null default '{}'::jsonb,
  parameters jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) default auth.uid(),
  is_illustrative boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.scenario_results (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  metric text not null,
  unit text not null,
  baseline double precision not null,
  estimate double precision not null,
  created_at timestamptz not null default now()
);

-- 11. audit_logs (no secrets, no PII beyond actor id)
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs (created_at desc);
