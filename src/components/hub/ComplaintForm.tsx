import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Box } from "./HubShell";
import { CityMap } from "@/components/app/CityMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMPLAINT_CATEGORIES } from "@/lib/types";
import { fileToSmallDataUrl, submitComplaint, type HubComplaint, type HubSession } from "@/lib/hub";

const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
type Draft = { title: string; description: string; category: string; severity: string; address: string; lat: number | null; lng: number | null; photo: File | null };
const empty: Draft = { title: "", description: "", category: "", severity: "", address: "", lat: null, lng: null, photo: null };

export function HubComplaintForm({ session, onCreated }: { session: HubSession; onCreated: (c: HubComplaint) => void }) {
  const [f, setF] = useState<Draft>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (f.title.trim().length < 3) err.title = "Title is required (at least 3 characters).";
    if (f.description.trim().length < 10) err.description = "Please describe the problem (at least 10 characters).";
    if (!f.category) err.category = "Select a category.";
    if (!f.severity) err.severity = "Select how serious it is.";
    if (!f.address.trim()) err.address = "Enter the area or address.";
    if (f.lat === null || f.lng === null) err.location = "Click the map to place the pin.";
    if (f.photo && !["image/jpeg", "image/png", "image/webp"].includes(f.photo.type)) err.photo = "Photo must be JPEG, PNG or WebP.";
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    try {
      const photo = f.photo ? await fileToSmallDataUrl(f.photo) : null;
      const c = submitComplaint(session, {
        title: f.title.trim(), description: f.description.trim(), category: f.category, severity: f.severity as HubComplaint["severity"],
        address: f.address.trim(), lat: f.lat!, lng: f.lng!, photo,
      });
      toast.success(`Complaint ${c.no} sent to the Mayor.`);
      setF(empty);
      onCreated(c);
    } catch (ex) { toast.error(`Complaint was NOT saved: ${(ex as Error).message}`); } finally { setBusy(false); }
  }
  const Err = ({ k }: { k: string }) => (errors[k] ? <p className="text-xs font-medium text-rose-600" role="alert">{errors[k]}</p> : null);

  return (
    <Box title="Submit a complaint to the Mayor">
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div className="space-y-1.5"><Label htmlFor="c-title">Title *</Label><Input id="c-title" value={f.title} maxLength={150} onChange={(e) => set("title", e.target.value)} /><Err k="title" /></div>
        <div className="space-y-1.5"><Label htmlFor="c-desc">What is the problem? *</Label><Textarea id="c-desc" rows={4} value={f.description} maxLength={4000} onChange={(e) => set("description", e.target.value)} /><Err k="description" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Category *</Label>
            <Select value={f.category} onValueChange={(v) => set("category", v)}><SelectTrigger aria-label="Category"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{COMPLAINT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><Err k="category" /></div>
          <div className="space-y-1.5"><Label>How serious? *</Label>
            <Select value={f.severity} onValueChange={(v) => set("severity", v)}><SelectTrigger aria-label="Severity"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{SEVERITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><Err k="severity" /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="c-addr">Area or address *</Label><Input id="c-addr" placeholder="e.g. Latifabad Unit 6" value={f.address} onChange={(e) => set("address", e.target.value)} /><Err k="address" /></div>
        <div className="space-y-1.5">
          <Label>Location on map * <span className="font-normal text-muted-foreground">(click to drop the pin)</span></Label>
          <div className="h-64 overflow-hidden rounded-xl border-2 border-violet-200">
            <CityMap assets={[]} incidents={[]} zoom={13} onPick={(lat, lng) => setF((p) => ({ ...p, lat, lng }))} picked={f.lat !== null && f.lng !== null ? [f.lat, f.lng] : null} />
          </div>
          {f.lat !== null && <p className="text-xs text-muted-foreground">Pin: {f.lat}, {f.lng}</p>}
          <Err k="location" />
        </div>
        <div className="space-y-1.5"><Label htmlFor="c-photo">Photograph (optional)</Label>
          <Input id="c-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => set("photo", e.target.files?.[0] ?? null)} /><Err k="photo" /></div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => { setF(empty); setErrors({}); }}>Clear</Button>
          <Button type="submit" disabled={busy} className="bg-gradient-to-r from-emerald-500 to-sky-500 text-white hover:opacity-90">{busy ? "Sending…" : "Send to Mayor"}</Button>
        </div>
      </form>
    </Box>
  );
}
