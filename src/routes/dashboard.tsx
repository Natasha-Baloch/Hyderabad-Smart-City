import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, TriangleAlert, Gauge, CheckCircle2 } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell, Panel } from "@/components/app/AppShell";
import { CityMap, MapLegend } from "@/components/app/CityMap";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, getAssets, getIncidentTrend, useIncidents } from "@/lib/data";
import { DATA_SOURCE, LAST_UPDATED } from "@/data/mock";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "City Dashboard — Hyderabad Digital Twin" },
      { name: "description", content: "Overview of Hyderabad, Sindh city assets, incidents and trends." },
      { property: "og:title", content: "City Dashboard — Hyderabad Digital Twin" },
      { property: "og:description", content: "City overview with map, charts and recent incidents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Dashboard() {
  const incidents = useIncidents();
  const assets = getAssets();
  const open = incidents.filter((i) => i.status !== "Resolved").length;
  const resolved = incidents.length - open;
  const byCat = Object.entries(
    incidents.reduce<Record<string, number>>((a, i) => ((a[i.category] = (a[i.category] ?? 0) + 1), a), {}),
  ).map(([name, value]) => ({ name, value }));

  const stats = [
    { label: "City assets", value: assets.length, icon: Building2, tone: "bg-accent text-accent-foreground" },
    { label: "Open incidents", value: open, icon: TriangleAlert, tone: "bg-warning-soft text-warning" },
    { label: "Monitored indicators", value: 12, icon: Gauge, tone: "bg-info-soft text-info" },
    { label: "Resolved incidents", value: resolved, icon: CheckCircle2, tone: "bg-success-soft text-success" },
  ];

  return (
    <AppShell
      title="City Dashboard"
      subtitle="Overview of Hyderabad's urban systems and current status."
      actions={<p className="text-xs text-muted-foreground">Last updated: {formatDate(LAST_UPDATED)} · Source: {DATA_SOURCE}</p>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5">
            <span className={`grid h-9 w-9 place-items-center rounded-lg ${s.tone}`}><s.icon className="h-4 w-4" /></span>
            <p className="mt-3 text-sm text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Hyderabad city map" className="xl:col-span-2" action={<MapLegend />}>
          <div className="h-80 overflow-hidden rounded-lg border">
            <CityMap assets={assets} incidents={incidents} zoom={12} />
          </div>
        </Panel>
        <div className="grid gap-4">
          <Panel title="Incidents by category">
            <div className="h-40">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65}>
                    {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Incident trend (7 days)">
            <div className="h-32">
              <ResponsiveContainer>
                <BarChart data={getIncidentTrend()}>
                  <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Recent incidents" className="mt-4" action={<Link to="/incidents" className="text-sm font-medium text-primary">View all</Link>}>
        <Table>
          <TableHeader>
            <TableRow><TableHead>ID</TableHead><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Reported</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {incidents.slice(0, 5).map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.id}</TableCell><TableCell>{i.title}</TableCell><TableCell>{i.category}</TableCell>
                <TableCell><StatusBadge value={i.severity} /></TableCell><TableCell><StatusBadge value={i.status} /></TableCell>
                <TableCell className="text-muted-foreground">{formatDate(i.reportedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </AppShell>
  );
}
