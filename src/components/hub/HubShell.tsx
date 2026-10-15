import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Building2, LogOut, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { HOME_FOR, ROLE_TITLE, markNoticesRead, noticesFor, signOutHub, useHub, useSession, formatWhen, type HubRole } from "@/lib/hub";

export const THEME: Record<HubRole, { bar: string; chip: string; tile: string[] }> = {
  citizen: { bar: "from-emerald-500 via-teal-500 to-sky-500", chip: "bg-emerald-100 text-emerald-800", tile: ["from-emerald-400 to-teal-500", "from-sky-400 to-blue-500", "from-amber-400 to-orange-500", "from-pink-400 to-rose-500", "from-violet-400 to-purple-500", "from-cyan-400 to-sky-500"] },
  mayor: { bar: "from-indigo-600 via-violet-600 to-fuchsia-500", chip: "bg-violet-100 text-violet-800", tile: ["from-indigo-500 to-violet-600", "from-fuchsia-500 to-pink-500", "from-amber-400 to-orange-500", "from-emerald-400 to-teal-500", "from-sky-400 to-blue-500", "from-rose-400 to-red-500"] },
  govt: { bar: "from-amber-500 via-orange-500 to-rose-500", chip: "bg-orange-100 text-orange-800", tile: ["from-amber-400 to-orange-500", "from-rose-400 to-pink-500", "from-teal-400 to-emerald-500", "from-indigo-400 to-violet-500", "from-sky-400 to-blue-500", "from-fuchsia-400 to-purple-500"] },
};

/** Redirects to /login unless a session for `role` exists in this tab. */
export function RequireHub({ role, children }: { role: HubRole; children: (s: NonNullable<ReturnType<typeof useSession>>) => ReactNode }) {
  const session = useSession();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const wrongOrNone = ready && (!session || session.role !== role);
  useEffect(() => {
    if (!wrongOrNone) return;
    navigate({ to: "/login", search: { role: role === "govt" ? "chief_minister" : role } });
  }, [wrongOrNone, navigate, role]);
  if (!ready || !session || session.role !== role) return <div role="status" className="grid min-h-screen place-items-center text-sm font-medium text-violet-700">Loading…</div>;
  return <>{children(session)}</>;
}

function Bell_({ role, userId }: { role: HubRole; userId: string }) {
  const db = useHub();
  const session = useSession();
  const list = session ? noticesFor(db, session) : [];
  const unread = list.filter((n) => !n.read).length;
  return (
    <Popover onOpenChange={(o) => { if (!o) markNoticesRead(role, userId); }}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="icon" aria-label={`Notifications, ${unread} unread`} className="relative bg-white/90 hover:bg-white">
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">{unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b bg-gradient-to-r from-violet-500 to-pink-500 p-3 font-semibold text-white">Notifications</div>
        <ul className="max-h-80 divide-y overflow-y-auto">
          {list.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</li>}
          {list.map((n) => (
            <li key={n.id} className={`p-3 text-sm ${n.read ? "" : "bg-pink-50"}`}>
              <p className="font-semibold">{n.title}</p>
              <p className="text-muted-foreground">{n.body}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatWhen(n.at)}</p>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function HubShell({ role, userId, name, city, title, subtitle, children }: { role: HubRole; userId: string; name: string; city: string; title: string; subtitle: string; children: ReactNode }) {
  const navigate = useNavigate();
  const th = THEME[role];
  return (
    <div className="min-h-screen">
      <header className={`bg-gradient-to-r ${th.bar} text-white shadow-lg`}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/25 backdrop-blur"><Building2 className="h-5 w-5" /></span>
            <span className="leading-tight"><span className="block font-extrabold">Hyderabad Digital Twin</span><span className="block text-xs text-white/85">{ROLE_TITLE[role]}</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-right text-xs leading-tight sm:block"><span className="block font-semibold">{name}</span><span className="inline-flex items-center gap-1 text-white/85"><MapPin className="h-3 w-3" />{city}</span></span>
            <Bell_ role={role} userId={userId} />
            <Button variant="secondary" size="sm" className="bg-white/90 hover:bg-white" onClick={() => { signOutHub(); navigate({ to: "/" }); }}><LogOut className="h-4 w-4" /> Sign out</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}

export function Tile({ label, value, grad, icon: Icon }: { label: string; value: string | number; grad: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${grad} p-4 text-white shadow-md transition-transform hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between"><p className="text-sm font-medium text-white/90">{label}</p><Icon className="h-5 w-5 text-white/90" /></div>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

export function Box({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`hub-card rounded-2xl border bg-card p-5 ${className}`}>
      {title && <div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-lg font-bold">{title}</h2>{action}</div>}
      {children}
    </section>
  );
}

export const STATE_STYLE: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Accepted: "bg-sky-100 text-sky-800",
  "In Progress": "bg-violet-100 text-violet-800",
  Completed: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-rose-100 text-rose-800",
  Low: "bg-emerald-100 text-emerald-800", Medium: "bg-amber-100 text-amber-800", High: "bg-orange-100 text-orange-800", Critical: "bg-rose-100 text-rose-800",
};
export const Pill = ({ v }: { v: string }) => <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${STATE_STYLE[v] ?? "bg-muted"}`}>{v}</span>;
