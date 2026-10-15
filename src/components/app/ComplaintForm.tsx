import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Panel } from "./AppShell";
import { CityMap } from "./CityMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createComplaint } from "@/lib/api";
import { COMPLAINT_CATEGORIES, type Complaint, type IncidentCategory, type Severity } from "@/lib/types";

const SEVERITIES: Severity[] = ["Low", "Medium", "High", "Critical"];
const MAX_PHOTO = 5 * 1024 * 1024;

export interface ComplaintDraft { title: string; description: string; category: string; severity: string; address: string; lat: number | null; lng: number | null; photo: File | null }
export const emptyDraft: ComplaintDraft = { title: "", description: "", category: "", severity: "", address: "", lat: null, lng: null, photo: null };

export type DraftErrors = Partial<Record<"title" | "description" | "category" | "severity" | "address" | "location" | "photo", string>>;

export function validateDraft(f: ComplaintDraft): DraftErrors {
  const e: DraftErrors = {};
  if (f.title.trim().length < 3) e.title = "Title is required (at least 3 characters).";
  if (f.description.trim().length < 10) e.description = "Please describe the problem (at least 10 characters).";
  if (!f.category) e.category = "Select a category.";
  if (!f.severity) e.severity = "Select a severity.";
  if (!f.address.trim()) e.address = "Enter the area or address.";
  if (f.lat === null || f.lng === null) e.location = "Click the map to choose the exact location.";
  if (f.photo && !["image/jpeg", "image/png", "image/webp"].includes(f.photo.type)) e.photo = "Photo must be JPEG, PNG or WebP.";
  if (f.photo && f.photo.size > MAX_PHOTO) e.photo = "Photo must be 5 MB or smaller.";
  return e;
}

export function ComplaintForm({ userId, onCreated }: { userId: string; onCreated?: (c: Complaint) => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<ComplaintDraft>(emptyDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof ComplaintDraft>(k: K, v: ComplaintDraft[K]) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err = validateDraft(f);
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    try {
      const c = await createComplaint({
        title: f.title.trim(), description: f.description.trim(), category: f.category as IncidentCategory, severity: f.severity as Severity,
        address: f.address.trim(), lat: f.lat!, lng: f.lng!, photo: f.photo,
      }, userId);
      // success is announced ONLY after the database confirmed the save
      toast.success(`Complaint ${c.complaintNo} submitted${c.isDemo ? " (demo — not saved to a database)" : ""}.`);
      qc.invalidateQueries({ queryKey: ["my-complaints"] });
      qc.invalidateQueries({ queryKey: ["public-incidents"] });
      setF(emptyDraft);
      onCreated?.(c);
    } catch (ex) {
      toast.error(`Complaint was NOT saved: ${(ex as Error).message}`);
    } finally { setBusy(false); }
  }
  const Err = ({ k }: { k: keyof DraftErrors }) => (errors[k] ? <p className="text-xs text-destructive" role="alert">{errors[k]}</p> : null);

  return (
    <Panel title="Submit a complaint">
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div className="space-y-1.5"><Label htmlFor="c-title">Title *</Label><Input id="c-title" value={f.title} maxLength={150} onChange={(e) => set("title", e.target.value)} aria-invalid={!!errors.title} /><Err k="title" /></div>
        <div className="space-y-1.5"><Label htmlFor="c-desc">Detailed description *</Label><Textarea id="c-desc" rows={4} value={f.description} maxLength={4000} onChange={(e) => set("description", e.target.value)} aria-invalid={!!errors.description} /><Err k="description" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Category *</Label>
            <Select value={f.category} onValueChange={(v) => set("category", v)}><SelectTrigger aria-label="Category"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{COMPLAINT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><Err k="category" /></div>
          <div className="space-y-1.5"><Label>Severity *</Label>
            <Select value={f.severity} onValueChange={(v) => set("severity", v)}><SelectTrigger aria-label="Severity"><SelectValue placeholder="Select severity" /></SelectTrigger>
              <SelectContent>{SEVERITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><Err k="severity" /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="c-addr">Area or address *</Label><Input id="c-addr" placeholder="e.g. Latifabad Unit 6" value={f.address} onChange={(e) => set("address", e.target.value)} /><Err k="address" /></div>
        <div className="space-y-1.5">
          <Label>Location on map * <span className="font-normal text-muted-foreground">(click to place the pin)</span></Label>
          <div className="h-64 overflow-hidden rounded-lg border">
            <CityMap assets={[]} incidents={[]} zoom={13} onPick={(lat, lng) => setF((p) => ({ ...p, lat, lng }))} picked={f.lat !== null && f.lng !== null ? [f.lat, f.lng] : null} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><Label htmlFor="lat">Latitude</Label><Input id="lat" readOnly value={f.lat ?? ""} placeholder="—" /></div>
            <div><Label htmlFor="lng">Longitude</Label><Input id="lng" readOnly value={f.lng ?? ""} placeholder="—" /></div>
          </div>
          <Err k="location" />
        </div>
        <div className="space-y-1.5"><Label htmlFor="c-photo">Photograph (optional, max 5 MB)</Label>
          <Input id="c-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => set("photo", e.target.files?.[0] ?? null)} /><Err k="photo" /></div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => { setF(emptyDraft); setErrors({}); }}>Clear</Button>
          <Button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit complaint"}</Button>
        </div>
      </form>
    </Panel>
  );
}
