import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Building2, Landmark, MapPin, Users, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CITY_SUGGESTIONS, HOME_FOR, OFFICIALS, googleDemoLogin, loginCitizen, loginOfficial, registerCitizen, useSession, type HubRole } from "@/lib/hub";

type RoleParam = "citizen" | "mayor" | "chief_minister";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { role: RoleParam } => ({
    role: s.role === "mayor" || s.role === "chief_minister" ? s.role : "citizen",
  }),
  head: () => ({ meta: [{ title: "Sign in — Hyderabad Digital Twin" }] }),
  component: Login,
});

const ROLES: { key: RoleParam; hub: HubRole; title: string; blurb: string; icon: typeof Users; grad: string; btn: string }[] = [
  { key: "citizen", hub: "citizen", title: "People", blurb: "Report problems and follow the Mayor's reply.", icon: Users, grad: "from-emerald-500 via-teal-500 to-sky-500", btn: "bg-emerald-600 hover:bg-emerald-700" },
  { key: "mayor", hub: "mayor", title: "Mayor", blurb: "See complaints, accept or reject, update the work.", icon: Building2, grad: "from-indigo-600 via-violet-600 to-fuchsia-500", btn: "bg-violet-600 hover:bg-violet-700" },
  { key: "chief_minister", hub: "govt", title: "Sindh Govt", blurb: "Oversee every conversation between people and mayor.", icon: Landmark, grad: "from-amber-500 via-orange-500 to-rose-500", btn: "bg-orange-600 hover:bg-orange-700" },
];

function Login() {
  const { role } = Route.useSearch();
  const info = ROLES.find((r) => r.key === role)!;
  const navigate = useNavigate();
  const session = useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [city, setCity] = useState(role === "citizen" ? "" : role === "mayor" ? "Hyderabad" : "Sindh");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [google, setGoogle] = useState(false);
  const [gEmail, setGEmail] = useState("");

  // Reset the form when switching role tabs.
  useEffect(() => {
    setMode("in"); setError(null); setPassword(""); setGoogle(false);
    setCity(role === "citizen" ? "" : role === "mayor" ? "Hyderabad" : "Sindh");
  }, [role]);

  // Already signed in in this tab -> go to that dashboard.
  useEffect(() => { if (session) navigate({ to: HOME_FOR[session.role] as "/citizen" }); }, [session, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Please enter your name.");
    if (!city.trim()) return setError("Please enter your city.");
    if (password.length < 4) return setError("Password must be at least 4 characters.");
    setBusy(true);
    try {
      if (info.hub === "citizen") {
        if (mode === "up") { await registerCitizen(name, city, password); toast.success("Account created. Welcome!"); }
        else await loginCitizen(name, city, password);
      } else await loginOfficial(info.hub, name, city, password);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  async function submitGoogle(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(gEmail)) return setError("Enter a valid Google email address.");
    setBusy(true);
    try { await googleDemoLogin(gEmail, name.trim() || gEmail.split("@")[0], city); toast.success("Signed in with Google (demo)."); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  const official = info.hub !== "citizen" ? OFFICIALS[info.hub] : null;

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-sky-200 via-violet-200 to-pink-200 px-4 py-10">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className={`bg-gradient-to-r ${info.grad} p-6 text-white`}>
          <Link to="/" className="text-xs text-white/85 hover:underline">← Back to home</Link>
          <div className="mt-3 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/25"><info.icon className="h-6 w-6" /></span>
            <div><h1 className="text-2xl font-extrabold">{info.title} login</h1><p className="text-sm text-white/90">{info.blurb}</p></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1.5" role="tablist" aria-label="Choose who is signing in">
          {ROLES.map((r) => (
            <Link key={r.key} to="/login" search={{ role: r.key }} role="tab" aria-selected={r.key === role}
              className={`rounded-xl px-2 py-2 text-center text-sm font-bold transition ${r.key === role ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-800"}`}>
              {r.title}
            </Link>
          ))}
        </div>

        <div className="p-6">
          {google ? (
            <form onSubmit={submitGoogle} className="space-y-4" noValidate>
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Demo Google sign-in: no real Google account is contacted. To enable real Google login, connect Supabase or Firebase Auth (see README).</p>
              <div className="space-y-1.5"><Label htmlFor="ge">Google email</Label><Input id="ge" type="email" value={gEmail} onChange={(e) => setGEmail(e.target.value)} placeholder="you@gmail.com" autoComplete="email" /></div>
              <div className="space-y-1.5"><Label htmlFor="gn">Your name</Label><Input id="gn" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
              <div className="space-y-1.5"><Label htmlFor="gc">Your city</Label><Input id="gc" list="cities" value={city} onChange={(e) => setCity(e.target.value)} /></div>
              {error && <p role="alert" className="text-sm font-medium text-rose-600">{error}</p>}
              <Button type="submit" disabled={busy} className={`w-full text-white ${info.btn}`}>{busy ? "Please wait…" : "Continue with Google"}</Button>
              <button type="button" onClick={() => { setGoogle(false); setError(null); }} className="w-full text-center text-sm text-slate-500 hover:underline">← Back to name and password</button>
            </form>
          ) : (
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div className="space-y-1.5"><Label htmlFor="n">Name</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder={info.hub === "citizen" ? "Your full name" : "Your name"} /></div>
              <div className="space-y-1.5"><Label htmlFor="c" className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Which city do you belong to?</Label>
                <Input id="c" list="cities" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Hyderabad" /></div>
              <div className="space-y-1.5"><Label htmlFor="p" className="flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> Password</Label>
                <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} /></div>
              {error && <p role="alert" className="text-sm font-medium text-rose-600">{error}</p>}
              <Button type="submit" disabled={busy} className={`w-full text-white ${info.btn}`}>{busy ? "Please wait…" : info.hub === "citizen" ? (mode === "in" ? "Sign in" : "Create my account") : `Sign in as ${info.title}`}</Button>

              {info.hub === "citizen" ? (
                <>
                  <div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
                  <Button type="button" variant="outline" className="w-full gap-2 border-2" onClick={() => { setGoogle(true); setError(null); }}>
                    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
                    Continue with Google
                  </Button>
                  <button type="button" className="w-full text-center text-sm font-semibold text-emerald-700 hover:underline" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(null); }}>
                    {mode === "in" ? "New here? Create a people account" : "Already have an account? Sign in"}
                  </button>
                </>
              ) : (
                <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Official accounts cannot self-register. Demo access: city <b>{official!.city}</b>, password <b>{official!.password}</b> (change in <code>src/lib/hub.ts</code>).</p>
              )}
            </form>
          )}
          <datalist id="cities">{CITY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
      </div>
    </div>
  );
}
