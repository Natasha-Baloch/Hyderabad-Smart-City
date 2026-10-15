import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Bus, Droplets, HeartPulse, Hourglass, MessageSquareText, Trees, CheckCircle2 } from "lucide-react";
import { HubShell, RequireHub, Tile, Box, Pill, THEME } from "@/components/hub/HubShell";
import { Conversation, Composer, Stars } from "@/components/hub/Thread";
import { LandmarkStrip } from "@/components/hub/Landmarks";
import { HubComplaintForm } from "@/components/hub/ComplaintForm";
import { countAssets, toIncident } from "@/components/hub/helpers";
import { MapWorkbench } from "@/components/app/MapWorkbench";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { giveFeedback, formatWhen, useHub, type HubComplaint, type HubSession } from "@/lib/hub";
import { getAssets } from "@/lib/data";

export const Route = createFileRoute("/citizen")({
  head: () => ({ meta: [{ title: "People Dashboard — Hyderabad Digital Twin" }, { name: "description", content: "Report and track city complaints in Hyderabad, Sindh." }] }),
  component: () => <RequireHub role="citizen">{(s) => <CitizenDashboard s={s} />}</RequireHub>,
});

const tabCls = "data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-sky-500 data-[state=active]:text-white";

function CitizenDashboard({ s }: { s: HubSession }) {
  const db = useHub();
  const [tab, setTab] = useState("overview");
  const [selId, setSelId] = useState<string | null>(null);
  const assets = useMemo(() => getAssets(), []);
  const n = countAssets(assets);
  const mine = db.complaints.filter((c) => c.citizenId === s.userId);
  const sel = mine.find((c) => c.id === selId) ?? null;
  const pending = mine.filter((c) => c.state === "Pending" || c.state === "Accepted" || c.state === "In Progress").length;
  const done = mine.filter((c) => c.state === "Completed").length;
  const g = THEME.citizen.tile;

  return (
    <HubShell role="citizen" userId={s.userId} name={s.name} city={s.city} title={`Welcome, ${s.name}`} subtitle="Your city at a glance. Report a problem and the Mayor will reply here.">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 h-auto flex-wrap bg-white/70">
          <TabsTrigger value="overview" className={tabCls}>Hyderabad map</TabsTrigger>
          <TabsTrigger value="new" className={tabCls}>New complaint</TabsTrigger>
          <TabsTrigger value="mine" className={tabCls}>My complaints &amp; replies ({mine.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Tile label="Schools" value={n.schools} grad={g[0]} icon={BookOpen} />
            <Tile label="Roads" value={n.roads} grad={g[1]} icon={Bus} />
            <Tile label="Healthcare" value={n.healthcare} grad={g[2]} icon={HeartPulse} />
            <Tile label="Water points" value={n.water} grad={g[3]} icon={Droplets} />
            <Tile label="Parks" value={n.parks} grad={g[4]} icon={Trees} />
            <Tile label="My open issues" value={pending} grad={g[5]} icon={Hourglass} />
          </div>
          <p className="text-xs text-muted-foreground">Counts are sample data for this demo, not official totals for Hyderabad.</p>
          <Box title="Hyderabad map — schools, roads, hospitals, water and your complaints">
            <MapWorkbench assets={assets} incidents={mine.map(toIncident)} colorBy="status" height="h-[480px]" />
          </Box>
          <Box><LandmarkStrip /></Box>
          <Box title="Do you have a problem?" action={<Button onClick={() => setTab("new")} className="bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:opacity-90">Submit a complaint</Button>}>
            <p className="text-sm text-muted-foreground">Roads, water, drainage, electricity, waste, street lights — tell the Mayor directly. You will get a notification when there is a reply.</p>
          </Box>
        </TabsContent>

        <TabsContent value="new">
          <HubComplaintForm session={s} onCreated={(c) => { setSelId(c.id); setTab("mine"); }} />
        </TabsContent>

        <TabsContent value="mine">
          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <Box title="My complaints">
              {mine.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">You have not sent any complaint yet.</p> : (
                <ul className="space-y-2">
                  {mine.map((c) => (
                    <li key={c.id}>
                      <button onClick={() => setSelId(c.id)} className={`w-full rounded-xl border-2 p-3 text-left transition ${sel?.id === c.id ? "border-emerald-400 bg-emerald-50" : "border-transparent bg-white/70 hover:border-emerald-200"}`}>
                        <span className="flex items-center justify-between gap-2"><b>{c.no}</b><Pill v={c.state} /></span>
                        <span className="block font-medium">{c.title}</span>
                        <span className="text-xs text-muted-foreground">{c.category} · {formatWhen(c.createdAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Box>
            {sel ? <CitizenDetail s={s} c={sel} /> : <Box title="Reply from the Mayor"><p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"><MessageSquareText className="mx-auto mb-2 h-6 w-6" />Select a complaint to read the Mayor's reply.</p></Box>}
          </div>
          {done > 0 && <p className="mt-3 flex items-center gap-1 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {done} of your complaints are completed.</p>}
        </TabsContent>
      </Tabs>
    </HubShell>
  );
}

function CitizenDetail({ s, c }: { s: HubSession; c: HubComplaint }) {
  const db = useHub();
  const msgs = db.messages.filter((m) => m.complaintId === c.id);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  return (
    <Box title={`${c.no} — ${c.title}`} action={<Pill v={c.state} />}>
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">{c.description}</p>
        <p><span className="text-muted-foreground">Where:</span> {c.address}</p>
        {c.photo && <img src={c.photo} alt="Your complaint photo" className="max-h-56 rounded-xl border object-cover" />}
        <div><h3 className="mb-2 font-bold">Conversation with the Mayor</h3><Conversation messages={msgs} />
          <Composer session={s} complaint={c} placeholder="Write a message to the Mayor…" /></div>
        {c.state === "Completed" && (
          <div className="rounded-xl bg-gradient-to-r from-amber-100 to-pink-100 p-4">
            <h3 className="font-bold">Your feedback</h3>
            {c.feedback ? <div className="mt-1"><Stars value={c.feedback.rating} /><p className="mt-1">{c.feedback.comment || "—"}</p></div> : (
              <div className="mt-2 space-y-2">
                <p className="text-muted-foreground">The Mayor marked this work as completed. How was it?</p>
                <Stars value={rating} onChange={setRating} />
                <Textarea rows={2} placeholder="Optional comment" value={comment} onChange={(e) => setComment(e.target.value)} className="bg-white" />
                <Button disabled={rating === 0} onClick={() => { giveFeedback(s, c, rating, comment); toast.success("Thank you for your feedback!"); }}>Send feedback</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Box>
  );
}
