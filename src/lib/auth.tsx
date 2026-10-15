import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";
import { AREA_ROLES, HOME_FOR_ROLE, type RoleChoice } from "./roles";
import type { AppRole } from "./types";

export interface AuthState {
  loading: boolean;
  demo: boolean;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  role: AppRole | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  /** Demo mode only: pick a local, unprivileged-by-design demo persona. Never touches the database. */
  enterDemo: (role: AppRole) => void;
}

const Ctx = createContext<AuthState | null>(null);
export const DEMO_USER_ID = "00000000-0000-0000-0000-00000000demo";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<{ role: AppRole; display_name: string; account_status: string } | null>(null);
  const [demoRole, setDemoRole] = useState<AppRole | null>(null);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!supabase || !s) { setProfile(null); return; }
    // Role is read from the protected profiles table — never from client-editable user metadata.
    const { data, error } = await supabase.from("profiles").select("role, display_name, account_status").eq("id", s.user.id).single();
    if (error || !data || data.account_status !== "active") { setProfile(null); return; }
    setProfile(data as typeof profile);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (alive) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      // defer to avoid deadlocks inside the auth callback
      setTimeout(() => { loadProfile(s); }, 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const value = useMemo<AuthState>(() => ({
    loading,
    demo: !isSupabaseConfigured,
    userId: isSupabaseConfigured ? session?.user.id ?? null : demoRole ? DEMO_USER_ID : null,
    email: session?.user.email ?? null,
    displayName: isSupabaseConfigured ? profile?.display_name ?? null : demoRole ? "Demo user" : null,
    role: isSupabaseConfigured ? profile?.role ?? null : demoRole,
    async signIn(email, password) {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signUp(email, password, displayName) {
      if (!supabase) throw new Error("Supabase is not configured.");
      // `display_name` is the only metadata sent; the DB trigger always assigns role = citizen.
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
      if (error) throw error;
      return { needsConfirmation: !data.session };
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut();
      setDemoRole(null); setProfile(null); setSession(null);
    },
    enterDemo: (r) => setDemoRole(r),
  }), [loading, session, profile, demoRole]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

/** Client-side convenience guard. Real enforcement is RLS/RPC in the database. */
export function RequireRole({ area, children }: { area: RoleChoice; children: ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const allowed = auth.role ? AREA_ROLES[area].includes(auth.role) : false;

  useEffect(() => {
    if (!auth.loading && !auth.userId) navigate({ to: "/login", search: { role: area } });
  }, [auth.loading, auth.userId, area, navigate]);

  if (auth.loading) return <div role="status" className="grid min-h-screen place-items-center text-sm text-muted-foreground">Restoring session…</div>;
  if (!auth.userId) return null;
  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4" role="alert">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account{auth.role ? ` (${auth.role.replace("_", " ")})` : ""} is not authorised for this area. Choosing a role card does not grant privileges.</p>
          <div className="mt-6 flex justify-center gap-2">
            {auth.role && <Link to={HOME_FOR_ROLE[auth.role] as "/citizen"} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go to my dashboard</Link>}
            <button onClick={() => auth.signOut()} className="rounded-md border px-4 py-2 text-sm font-medium">Sign out</button>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
