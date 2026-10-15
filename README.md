# Hyderabad Smart City Digital Twin

## NEW: three logins + complaint flow (works with no setup)
`npm install` then `npm run dev`, open the site and click **Get Started**.

| Login | Form fields | Goes to |
|---|---|---|
| People (citizen) | Name, City, Password (create account or sign in) or "Continue with Google" (demo) | `/citizen` |
| Mayor | Name, City, Password | `/mayor` |
| Government of Sindh | Name, City, Password | `/minister` |

Demo official access (change in `src/lib/hub.ts`, `OFFICIALS`): Mayor = city `Hyderabad`, password `mayor@123`; Sindh Govt = city `Sindh`, password `sindh@123`.

Flow: citizen submits a complaint (photo + map pin) -> Mayor gets a notification -> Mayor accepts / rejects / marks in progress / completed with a reply -> citizen gets a notification and can chat and give feedback -> Sindh Government sees every conversation (read-only).

Storage: this version keeps data in the browser (`localStorage`, see `src/lib/hub.ts`), so open the citizen and the mayor in two tabs of the same browser to watch it live. Sessions are per tab. The Google button is a demo (no real Google contact). For production, move `hub.ts` to Supabase (schema in `/supabase`) and enable the Google provider there.

---


React + TypeScript + Vite + TanStack Router (unchanged), now with a Supabase backend (Auth, PostgreSQL, Storage, Realtime) and three role-based experiences: **Citizen**, **Mayor of Hyderabad**, **Chief Minister of Sindh**.

## Quick start
```sh
npm install            # adds @supabase/supabase-js (the lockfile bun.lock must be refreshed: `bun install`)
cp .env.example .env.local   # fill in your project URL + anon key
npm run dev
```
Without credentials the app runs in a **labelled DEMO mode** (sample data, in-memory only, nothing saved). Demo and database records are never mixed.

## Supabase setup
1. Create a Supabase project. Put **URL** and **anon key** in `.env.local`. Never put the service-role key or DB password in any `VITE_` variable.
2. Run, in order, in the SQL editor (or `supabase db push`): `supabase/migrations/0001_schema.sql`, `0002_functions_triggers.sql`, `0003_rls_storage.sql`.
3. Auth → Providers: enable Email. Decide whether email confirmation is required.
4. Optional (dev only): `supabase/seed_demo_optional.sql` (records are labelled `sample`).
5. Run `supabase/tests/rls_tests.sql` on a **development** project (rolls back) to verify the permission rules.

## Roles and provisioning
| Role | Can |
|---|---|
| citizen | create + read own complaints, own notifications, read assets |
| municipal_staff | read all complaints, assign, change status, internal notes |
| mayor | staff powers + manage assets, audit log, exports |
| chief_minister | read-only aggregate oversight, non-internal history, audit log |
| system_admin | staff powers + oversight |

Public sign-up always creates a `citizen` (a database trigger ignores any role sent by the client). A trigger blocks users changing their own `role`, `account_status` or `department`. To provision the Mayor / Chief Minister / staff: have them sign up normally, then run the statements in `supabase/provision_roles.sql` in the SQL editor (runs as the database owner). There is no public path to privileged roles.

## Where things are
- `src/lib/api.ts` — the only data-access layer (Supabase calls + demo fallback). `src/data/mock.ts` still holds the sample data.
- `src/lib/auth.tsx` — session restore, sign-in/up/out, `RequireRole` guard (UX only; real enforcement is RLS/RPC).
- `src/lib/roles.ts` — permission table and role→route map.
- Routes: `/` (home), `/start` (role cards), `/login?role=…`, `/citizen`, `/mayor`, `/minister`. Existing `/dashboard`, `/explorer`, `/incidents`, `/simulation` remain as the **demo** pages; `/admin` is now guarded.
- Map: `CityMap.tsx` / `CityMapLeaflet.tsx` extended (location picker, status/severity colours, escaped popups, ResizeObserver, single-instance cleanup); `MapWorkbench.tsx` adds search, layer toggles, filters, details.
- Workflow enforcement is in Postgres: `transition_incident`, `assign_incident`, `add_incident_note` RPCs; direct UPDATE of incidents is blocked.
- Landmark images: `src/assets/landmarks/`, configured in `src/data/landmarks.ts` (names marked "to be confirmed" are placeholders).

## Honest status
See the delivery notes: what was built vs. verified vs. still to do.
