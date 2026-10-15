import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Panel, EmptyState } from "@/components/app/AppShell";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, incidentStore, useIncidents } from "@/lib/data";
import { HYDERABAD_CENTER } from "@/data/mock";
import type { IncidentCategory, IncidentStatus, Severity } from "@/lib/types";

export const Route = createFileRoute("/incidents")({
  head: () => ({
    meta: [
      { title: "Incident Management — Hyderabad Digital Twin" },
      { name: "description", content: "Report, track and manage city incidents in Hyderabad, Sindh." },
      { property: "og:title", content: "Incident Management — Hyderabad" },
      { property: "og:description", content: "Search, filter and report urban incidents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Incidents,
});

const CATS: IncidentCategory[] = ["Roads", "Water & Sanitation", "Electricity", "Public Safety", "Other"];
const SEVS: Severity[] = ["Low", "Medium", "High"];
const STATUSES: IncidentStatus[] = ["Reported", "In Progress", "Resolved"];

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="bg-card"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Incidents() {
  const incidents = useIncidents();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [sev, setSev] = useState("all");
  const [st, setSt] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(incidents[0]?.id ?? null);

  const rows = useMemo(
    () => incidents.filter((i) =>
      (cat === "all" || i.category === cat) && (sev === "all" || i.severity === sev) && (st === "all" || i.status === st) &&
      `${i.id} ${i.title} ${i.location}`.toLowerCase().includes(q.toLowerCase())),
    [incidents, q, cat, sev, st],
  );
  const selected = incidents.find((i) => i.id === selectedId) ?? null;

  return (
    <AppShell title="Incident Management" subtitle="Report, track and manage city incidents (sample data).">
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search incidents" placeholder="Search incidents…" className="pl-9 bg-card" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <FilterSelect label="categories" value={cat} onChange={setCat} options={CATS} />
        <FilterSelect label="severities" value={sev} onChange={setSev} options={SEVS} />
        <FilterSelect label="statuses" value={st} onChange={setSt} options={STATUSES} />
      </div>

      <Panel>
        {rows.length === 0 ? <EmptyState text="No incidents match the current filters." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((i) => (
                <TableRow key={i.id} onClick={() => setSelectedId(i.id)} data-state={i.id === selectedId ? "selected" : undefined} className="cursor-pointer">
                  <TableCell className="font-medium">{i.id}</TableCell><TableCell>{i.title}</TableCell><TableCell>{i.category}</TableCell>
                  <TableCell><StatusBadge value={i.severity} /></TableCell><TableCell><StatusBadge value={i.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(i.reportedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Incident details">
          {selected ? (
            <div className="space-y-3 text-sm">
              <div className="flex gap-2"><StatusBadge value={selected.id} /><StatusBadge value={selected.severity} /></div>
              <p className="text-base font-semibold">{selected.title}</p>
              <p><span className="text-muted-foreground">Category:</span> {selected.category}</p>
              <p><span className="text-muted-foreground">Location:</span> {selected.location}</p>
              <p><span className="text-muted-foreground">Reported:</span> {formatDate(selected.reportedAt)}</p>
              <p className="text-muted-foreground">{selected.description}</p>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={selected.status} onValueChange={(v) => { incidentStore.updateStatus(selected.id, v as IncidentStatus); toast.success(`Status updated to ${v}`); }}>
                  <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          ) : <EmptyState text="Select an incident to see details." />}
        </Panel>
        <ReportForm onCreated={setSelectedId} />
      </div>
    </AppShell>
  );
}

function ReportForm({ onCreated }: { onCreated: (id: string) => void }) {
  const empty = { title: "", category: "", severity: "", description: "", location: "" };
  const [f, setF] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<"title" | "category" | "severity" | "description", string>>>({});
  const set = (k: keyof typeof empty) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const err: Partial<Record<"title" | "category" | "severity" | "description", string>> = {};
    if (f.title.trim().length < 3) err.title = "Title is required (min 3 characters).";
    if (!f.category) err.category = "Select a category.";
    if (!f.severity) err.severity = "Select a severity.";
    if (f.description.trim().length < 5) err.description = "Description is required.";
    setErrors(err);
    if (Object.keys(err).length) return;
    const item = incidentStore.add({
      title: f.title.trim(), category: f.category as IncidentCategory, severity: f.severity as Severity,
      description: f.description.trim(), location: f.location.trim() || "Hyderabad (unspecified)", position: HYDERABAD_CENTER,
    });
    toast.success(`${item.id} reported (sample)`);
    onCreated(item.id);
    setF(empty);
  }

  const Err = ({ k }: { k: keyof typeof errors }) => errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null;

  return (
    <Panel title="Report new incident">
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div className="space-y-1.5"><Label htmlFor="t">Title *</Label><Input id="t" value={f.title} onChange={(e) => set("title")(e.target.value)} aria-invalid={!!errors.title} /><Err k="title" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Category *</Label>
            <Select value={f.category} onValueChange={set("category")}><SelectTrigger aria-label="Category"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><Err k="category" /></div>
          <div className="space-y-1.5"><Label>Severity *</Label>
            <Select value={f.severity} onValueChange={set("severity")}><SelectTrigger aria-label="Severity"><SelectValue placeholder="Select severity" /></SelectTrigger>
              <SelectContent>{SEVS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><Err k="severity" /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="d">Description *</Label><Textarea id="d" value={f.description} onChange={(e) => set("description")(e.target.value)} aria-invalid={!!errors.description} /><Err k="description" /></div>
        <div className="space-y-1.5"><Label htmlFor="l">Location</Label><Input id="l" placeholder="e.g. Latifabad Unit 6" value={f.location} onChange={(e) => set("location")(e.target.value)} /></div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => { setF(empty); setErrors({}); }}>Cancel</Button>
          <Button type="submit">Submit</Button>
        </div>
      </form>
    </Panel>
  );
}
