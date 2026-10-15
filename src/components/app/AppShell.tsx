import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Map, TriangleAlert, FlaskConical, Shield, Building2, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { NotificationBell } from "./Notifications";

const defaultNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/explorer", label: "Explorer", icon: Map },
  { to: "/incidents", label: "Incidents", icon: TriangleAlert },
  { to: "/simulation", label: "Simulation", icon: FlaskConical },
  { to: "/admin", label: "Admin", icon: Shield },
];

export interface NavItem { to: string; label: string; icon: LucideIcon }

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <Building2 className="h-5 w-5" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block font-bold text-sidebar-accent-foreground">Hyderabad</span>
        <span className="block text-[11px] text-sidebar-foreground/70">Smart City Digital Twin</span>
      </span>
    </Link>
  );
}

function UserBox() {
  const a = useAuth();
  if (a.demo && !a.userId) return null;
  return (
    <div className="mb-3 space-y-2 text-xs">
      {a.demo && <p className="rounded bg-warning-soft px-2 py-1 font-semibold text-warning">DEMO MODE — sample data, nothing is saved to a database</p>}
      {a.userId && (
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate"><span className="block truncate font-semibold text-sidebar-accent-foreground">{a.displayName}</span><span className="text-sidebar-foreground/70">{a.role?.replace("_", " ")}</span></span>
          <button onClick={() => a.signOut()} className="rounded border border-sidebar-border px-2 py-1 hover:bg-sidebar-accent">Sign out</button>
        </div>
      )}
    </div>
  );
}

export function AppShell({ title, subtitle, actions, children, nav = defaultNav, notifications = false }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; nav?: NavItem[]; notifications?: boolean }) {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground lg:flex lg:sticky lg:top-0 lg:h-screen">
        <Brand />
        <nav className="mt-8 space-y-1" aria-label="Main">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to as "/"}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground" }}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <UserBox />
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70"><MapPin className="h-3.5 w-3.5" /> Hyderabad, Sindh, Pakistan</div>
        </div>
      </aside>

      <div className="sticky top-0 z-[1000] bg-sidebar px-4 py-3 lg:hidden">
        <Brand />
        <nav className="mt-3 flex gap-1 overflow-x-auto" aria-label="Main">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to as "/"}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-sidebar-foreground"
              activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground" }}
            >
              <n.icon className="h-3.5 w-3.5" /> {n.label}
            </Link>
          ))}
        </nav>
      </div>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mb-3 lg:hidden"><UserBox /></div>
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">{actions}{notifications && <NotificationBell />}</div>
        </header>
        {children}
      </main>
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border bg-card p-5 ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
