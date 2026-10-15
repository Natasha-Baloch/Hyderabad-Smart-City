import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Inbox, MessageSquareText, Star, Users, Wrench, XCircle } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { HubShell, RequireHub, Tile, Box, Pill, THEME } from "@/components/hub/HubShell";
import { Conversation } from "@/components/hub/Thread";
import { LandmarkStrip } from "@/components/hub/Landmarks";
import { countAssets, toIncident } from "@/components/hub/helpers";
import { MapWorkbench } from "@/components/app/MapWorkbench";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatWhen, useHub, type ComplaintState, type HubSession } from "@/lib/hub";
import { getAssets } from "@/lib/data";

export const Route = createFileRoute("/minister")({
  head: () => ({ meta: [{ title: "Government of Sindh — Hyderabad Digital Twin" }] }),
  component: () => <RequireHub role="govt">{(s) => <GovtDashboard s={s} />}</RequireHub>,
});

const tabCls = "data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-rose-500 data-[state=active]:text-white";
const STATE_COLOR: Record<ComplaintState, string> = { Pending: "#f59e0b", Accepted: "#0ea5e9", "In Progress": "#8b5cf6", Completed: "#10b981", Rejected: "#f43f5e" };

function GovtDashboard({ s }: { s: HubSession }) {
  const db = useHub();
  const [tab, setTab] = useState("talk");
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const assets = useMemo(() => getAssets(), []);
  const n = countAssets(assets);
  const all = db.complaints;
  const count = (st: ComplaintState) => all.filter((c) => c.state === st).length;
  const needle = q.trim().toLowerCase();
  const rows = all.filter((c) => !needle || `${c.no} ${c.title} ${c.citizenName} ${c.address}`.toLowerCase().includes(needle));
  const sel = all.find((c) => c.id === selId) ?? rows[0] ?? null;
  const msgs = sel ? db.messages.filter((m) => m.complaintId === sel.id) : [];
  const rated = all.filter((c) => c.feedback);
  const avg = rated.length ? (rated.reduce((a, c) => a + c.feedback!.rating, 0) / rated.length).toFixed(1) : "—";
  const pie = (Object.keys(STATE_COLOR) as ComplaintState[]).map((k) => ({ name: k, value: count(k) })).filter((d) => d.value > 0);
  const g = THEME.govt.tile;

  return (
    <HubShell role="govt" userId={s.userId} name={s.name} city={s.city} title="Government of Sindh — Oversight" subtitle="Read-only view of every conversation between the people and the Mayor of Hyderabad.">
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Tile label="Complaints" value={all.length} grad={g[0]} icon={MessageSquareText} />
        <Tile label="Waiting for Mayor" value={count("Pending")} grad={g[1]} icon={Inbox} />
        <Tile label="In work" value={count("Accepted") + count("In Progress")} grad={g[3]} icon={Wrench} />
        <Tile label="Completed" value={count("Completed")} grad={g[2]} icon={CheckCircle2} />
        <Tile label="Rejected" value={count("Rejected")} grad={g[4]} icon={XCircle} />
        <Tile label="Avg. rating" value={avg} grad={g[5]} icon={Star} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 h-auto flex-wrap bg-white/70">
          <TabsTrigger value="talk" className={tabCls}>All conversations</TabsTrigger>
          <TabsTrigger value="map" className={tabCls}>Map &amp; city</TabsTrigger>
          <TabsTrigger value="stats" className={tabCls}>Progress &amp; feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="talk">
          <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
            <Box title="People ↔ Mayor">
              <Input aria-label="Search conversations" placeholder="Search by number, title, person, area…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3 bg-white" />
              {rows.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Nothing matches.</p> : (
                <ul className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
                  {rows.map((c) => (
                    <li key={c.id}><button onClick={() => setSelId(c.id)} className={`w-full rounded-xl border-2 p-3 text-left transition ${sel?.id === c.id ? "border-orange-400 bg-orange-50" : "border-transparent bg-white/70 hover:border-orange-200"}`}>
                      <span className="flex items-center justify-between gap-2"><b className="text-sm">{c.no}</b><Pill v={c.state} /></span>
                      <span className="block truncate text-sm font-medium">{c.title}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" />{c.citizenName} · {db.messages.filter((m) => m.complaintId === c.id).length} messages</span>
                    </button></li>
                  ))}
                </ul>
              )}
            </Box>
            {sel ? (
              <Box title={`${sel.no} — ${sel.title}`} action={<Pill v={sel.state} />}>
                <div className="space-y-4 text-sm">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <p><span className="text-muted-foreground">Citizen:</span> <b>{sel.citizenName}</b> ({sel.city})</p>
                      <p><span className="text-muted-foreground">Category:</span> {sel.category} · <Pill v={sel.severity} /></p>
                      <p><span className="text-muted-foreground">Where:</span> {sel.address}</p>
                      <p><span className="text-muted-foreground">Sent:</span> {formatWhen(sel.createdAt)}</p>
                    </div>
                    {sel.photo && <img src={sel.photo} alt="Photo from the citizen" className="max-h-48 rounded-xl border-2 border-white object-cover shadow" />}
                  </div>
                  <div><h3 className="mb-2 font-bold">Full conversation (read-only)</h3><Conversation messages={msgs} /></div>
                  {sel.feedback && <p className="rounded-xl bg-amber-50 p-3">Citizen rating: <b>{sel.feedback.rating}/5</b> {sel.feedback.comment && `— ${sel.feedback.comment}`}</p>}
                </div>
              </Box>
            ) : <Box title="Conversation"><p className="p-10 text-center text-sm text-muted-foreground">No complaints yet.</p></Box>}
          </div>
        </TabsContent>

        <TabsContent value="map" className="space-y-5">
          <Box title="Hyderabad map — all assets and complaints">
            <MapWorkbench assets={assets} incidents={all.map(toIncident)} colorBy="status" height="h-[520px]" />
            <p className="mt-2 text-xs text-muted-foreground">Registered (sample) assets: {n.total} — schools {n.schools}, roads {n.roads}, healthcare {n.healthcare}, water {n.water}, parks {n.parks}.</p>
          </Box>
          <Box><LandmarkStrip /></Box>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid gap-4 lg:grid-cols-2">
            <Box title="Complaints by status">
              {pie.length ? (
                <div className="h-64"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>{pie.map((d) => <Cell key={d.name} fill={STATE_COLOR[d.name as ComplaintState]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
              ) : <p className="p-6 text-center text-sm text-muted-foreground">No data yet.</p>}
            </Box>
            <Box title="Feedback from the people">
              {rated.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No feedback yet.</p> : (
                <ul className="space-y-2 text-sm">{rated.map((c) => <li key={c.id} className="rounded-xl bg-white/70 p-3"><b>{c.no}</b> · {c.feedback!.rating}/5 — {c.feedback!.comment || "no comment"} <span className="text-xs text-muted-foreground">({c.citizenName})</span></li>)}</ul>
              )}
            </Box>
          </div>
        </TabsContent>
      </Tabs>
    </HubShell>
  );
}
