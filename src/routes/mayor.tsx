import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Bus, CheckCircle2, Hourglass, Inbox, MessageSquareText, ThumbsDown, ThumbsUp, Wrench, XCircle } from "lucide-react";
import { HubShell, RequireHub, Tile, Box, Pill, THEME } from "@/components/hub/HubShell";
import { Conversation, Composer, Stars } from "@/components/hub/Thread";
import { LandmarkStrip } from "@/components/hub/Landmarks";
import { countAssets, toIncident } from "@/components/hub/helpers";
import { MapWorkbench } from "@/components/app/MapWorkbench";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { decideComplaint, formatWhen, noticesFor, updateProgress, useHub, type ComplaintState, type HubComplaint, type HubSession } from "@/lib/hub";
import { getAssets } from "@/lib/data";

export const Route = createFileRoute("/mayor")({
  head: () => ({ meta: [{ title: "Mayor Dashboard — Hyderabad Digital Twin" }] }),
  component: () => <RequireHub role="mayor">{(s) => <MayorDashboard s={s} />}</RequireHub>,
});

const tabCls = "data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-fuchsia-500 data-[state=active]:text-white";
const FILTERS: ("All" | ComplaintState)[] = ["All", "Pending", "Accepted", "In Progress", "Completed", "Rejected"];

function MayorDashboard({ s }: { s: HubSession }) {
  const db = useHub();
  const [tab, setTab] = useState("overview");
  const [selId, setSelId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | ComplaintState>("All");
  const assets = useMemo(() => getAssets(), []);
  const n = countAssets(assets);
  const all = db.complaints;
  const count = (st: ComplaintState) => all.filter((c) => c.state === st).length;
  const rows = all.filter((c) => filter === "All" || c.state === filter);
  const sel = all.find((c) => c.id === selId) ?? null;
  const notices = noticesFor(db, s);
  const unread = notices.filter((x) => !x.read).length;
  const feedbacks = all.filter((c) => c.feedback);
  const g = THEME.mayor.tile;
  const open = (id: string) => { setSelId(id); setTab("complaints"); };

  return (
    <HubShell role="mayor" userId={s.userId} name={s.name} city={s.city} title="Mayor's Dashboard" subtitle="Hyderabad, Sindh, Pakistan — complaints from the people, the work, and the replies.">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 h-auto flex-wrap bg-white/70">
          <TabsTrigger value="overview" className={tabCls}>Map &amp; overview</TabsTrigger>
          <TabsTrigger value="complaints" className={tabCls}>Complaints ({all.length})</TabsTrigger>
          <TabsTrigger value="notifs" className={tabCls}>Notifications{unread ? ` (${unread} new)` : ""}</TabsTrigger>
          <TabsTrigger value="feedback" className={tabCls}>Feedback ({feedbacks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Tile label="New requests" value={count("Pending")} grad={g[0]} icon={Inbox} />
            <Tile label="Accepted / in progress" value={count("Accepted") + count("In Progress")} grad={g[1]} icon={Wrench} />
            <Tile label="Work completed" value={count("Completed")} grad={g[3]} icon={CheckCircle2} />
            <Tile label="Rejected" value={count("Rejected")} grad={g[5]} icon={XCircle} />
            <Tile label="Schools" value={n.schools} grad={g[4]} icon={BookOpen} />
            <Tile label="Roads" value={n.roads} grad={g[2]} icon={Bus} />
          </div>
          <p className="text-xs text-muted-foreground">Schools and roads are sample counts for the demo. Click a complaint marker on the map to open it.</p>
          <Box title="Map of Hyderabad — schools, roads, hospitals and all complaints (colour = work status)">
            <MapWorkbench assets={assets} incidents={all.map(toIncident)} colorBy="status" height="h-[520px]"
              onSelectIncident={(i) => { const c = all.find((x) => x.no === i.id); if (c) setSelId(c.id); }} />
            {sel && <div className="mt-3 flex items-center justify-between rounded-xl bg-violet-50 p-3 text-sm"><span><b>{sel.no}</b> — {sel.title} <Pill v={sel.state} /></span><Button size="sm" onClick={() => open(sel.id)}>Open &amp; reply</Button></div>}
          </Box>
          <Box><LandmarkStrip /></Box>
        </TabsContent>

        <TabsContent value="complaints">
          <div className="mb-3 flex flex-wrap gap-2">
            {FILTERS.map((f) => <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className={filter === f ? "bg-violet-600" : "bg-white/70"}>{f}{f !== "All" ? ` (${count(f)})` : ""}</Button>)}
          </div>
          <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
            <Box title="Complaints">
              {rows.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No complaints here.</p> : (
                <ul className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
                  {rows.map((c) => (
                    <li key={c.id}>
                      <button onClick={() => setSelId(c.id)} className={`flex w-full gap-3 rounded-xl border-2 p-2.5 text-left transition ${sel?.id === c.id ? "border-violet-400 bg-violet-50" : "border-transparent bg-white/70 hover:border-violet-200"}`}>
                        {c.photo ? <img src={c.photo} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-200 to-pink-200 text-xs text-violet-700">no photo</span>}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2"><b className="text-sm">{c.no}</b><Pill v={c.state} /></span>
                          <span className="block truncate text-sm font-medium">{c.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{c.citizenName} · {formatWhen(c.createdAt)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Box>
            {sel ? <MayorDetail s={s} c={sel} /> : <Box title="Complaint"><p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground"><MessageSquareText className="mx-auto mb-2 h-6 w-6" />Select a complaint to see the photo, location and reply.</p></Box>}
          </div>
        </TabsContent>

        <TabsContent value="notifs">
          <Box title="Notifications">
            {notices.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet. New complaints from the people appear here.</p> : (
              <ul className="divide-y">
                {notices.map((x) => (
                  <li key={x.id}><button onClick={() => open(x.complaintId)} className={`flex w-full items-start gap-3 p-3 text-left text-sm hover:bg-violet-50 ${x.read ? "" : "bg-pink-50"}`}>
                    {!x.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label="New" />}
                    <span><span className="block font-semibold">{x.title}</span><span className="block text-muted-foreground">{x.body}</span><span className="text-xs text-muted-foreground">{formatWhen(x.at)}</span></span></button></li>
                ))}
              </ul>
            )}
          </Box>
        </TabsContent>

        <TabsContent value="feedback">
          <Box title="Feedback from the people">
            {feedbacks.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No feedback yet. People can rate the work once it is completed.</p> : (
              <ul className="grid gap-3 md:grid-cols-2">
                {feedbacks.map((c) => (
                  <li key={c.id} className="rounded-xl border bg-white/70 p-4 text-sm">
                    <p className="font-bold">{c.no} — {c.title}</p>
                    <Stars value={c.feedback!.rating} />
                    <p className="mt-1">{c.feedback!.comment || "—"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{c.citizenName} · {formatWhen(c.feedback!.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Box>
        </TabsContent>
      </Tabs>
    </HubShell>
  );
}

function MayorDetail({ s, c }: { s: HubSession; c: HubComplaint }) {
  const db = useHub();
  const msgs = db.messages.filter((m) => m.complaintId === c.id);
  const [note, setNote] = useState("");
  const done = (fn: () => void, ok: string) => { try { fn(); setNote(""); toast.success(ok); } catch (e) { toast.error((e as Error).message); } };
  return (
    <Box title={`${c.no} — ${c.title}`} action={<span className="flex gap-2"><Pill v={c.severity} /><Pill v={c.state} /></span>}>
      <div className="space-y-4 text-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <p><span className="text-muted-foreground">From:</span> <b>{c.citizenName}</b> ({c.city}){c.sample && <span className="ml-1 text-xs italic text-muted-foreground">sample</span>}</p>
            <p><span className="text-muted-foreground">Category:</span> {c.category}</p>
            <p><span className="text-muted-foreground">Where:</span> {c.address} ({c.lat.toFixed(4)}, {c.lng.toFixed(4)})</p>
            <p><span className="text-muted-foreground">Sent:</span> {formatWhen(c.createdAt)}</p>
            <p className="rounded-lg bg-white/70 p-2">{c.description}</p>
          </div>
          {c.photo ? <img src={c.photo} alt="Photo from the citizen" className="max-h-60 w-full rounded-xl border-2 border-white object-cover shadow" /> : <div className="grid min-h-32 place-items-center rounded-xl bg-gradient-to-br from-violet-100 to-pink-100 text-xs text-violet-700">No photo attached</div>}
        </div>

        <div className="rounded-xl bg-gradient-to-r from-violet-100 to-fuchsia-100 p-4">
          <Label htmlFor="reply" className="font-bold">Your reply to the citizen (optional)</Label>
          <Textarea id="reply" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. We are getting this ready — the crew arrives on Monday." className="mt-1 bg-white" />
          <div className="mt-3 flex flex-wrap gap-2">
            {c.state === "Pending" && (
              <>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => done(() => decideComplaint(s, c, "Accepted", note), "Accepted — citizen notified.")}><ThumbsUp className="h-4 w-4" /> Accept — we are getting it ready</Button>
                <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => done(() => decideComplaint(s, c, "Rejected", note), "Rejected — citizen notified.")}><ThumbsDown className="h-4 w-4" /> Reject — already done / not possible</Button>
              </>
            )}
            {(c.state === "Accepted") && <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => done(() => updateProgress(s, c, "In Progress", note), "Marked in progress.")}><Wrench className="h-4 w-4" /> Start work (in progress)</Button>}
            {(c.state === "Accepted" || c.state === "In Progress") && <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => done(() => updateProgress(s, c, "Completed", note), "Marked completed — citizen notified.")}><CheckCircle2 className="h-4 w-4" /> Mark work completed</Button>}
            {c.state === "Completed" && <p className="flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Work completed</p>}
            {c.state === "Rejected" && <p className="flex items-center gap-1 font-semibold text-rose-700"><Hourglass className="h-4 w-4" /> Rejected</p>}
          </div>
        </div>

        {c.feedback && <div className="rounded-xl bg-amber-50 p-3"><p className="font-bold">Citizen feedback</p><Stars value={c.feedback.rating} /><p>{c.feedback.comment || "—"}</p></div>}
        <div><h3 className="mb-2 font-bold">Conversation</h3><Conversation messages={msgs} /><Composer session={s} complaint={c} placeholder="Send a message to the citizen…" /></div>
      </div>
    </Box>
  );
}
