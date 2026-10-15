// Data-access layer for the real (Supabase) backend. Pages call these functions only —
// no `supabase.from(...)` appears in route components. When Supabase is not configured the
// app runs in a clearly labelled DEMO mode backed by src/data/mock.ts and an in-memory list.
import { supabase, isSupabaseConfigured } from "./supabase";
import * as mock from "@/data/mock";
import type {
  AppNotification, CityAsset, Complaint, IncidentCategory, IncidentStats, IncidentStatus, IncidentUpdate, Severity,
} from "./types";

export const isDemo = !isSupabaseConfigured;
const db = () => { if (!supabase) throw new Error("Supabase is not configured (demo mode)."); return supabase; };
const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };

// ---------- mappers ----------
/* eslint-disable @typescript-eslint/no-explicit-any */
const toComplaint = (r: any): Complaint => ({
  id: r.complaint_no, complaintNo: r.complaint_no, dbId: r.id, reporterId: r.reporter_id,
  title: r.title ?? `${r.category} report`, description: r.description ?? "", category: r.category, severity: r.severity,
  status: r.status, location: r.address ?? "", address: r.address ?? "", position: [r.lat, r.lng],
  reportedAt: r.created_at, imagePath: r.image_path ?? null, assignedDepartment: r.assigned_department ?? null,
  reviewedAt: r.reviewed_at ?? null, resolvedAt: r.resolved_at ?? null, isDemo: !!r.is_demo,
});
const toAsset = (r: any): CityAsset => ({
  id: r.id, name: r.name, category: r.category, type: r.asset_type, areaId: r.area_id ?? "", position: [r.lat, r.lng],
  status: r.operational_status, verification: r.verification === "verified" ? "Verified record" : r.verification === "sample" ? "Sample record (demonstration)" : "Unverified record",
});

// ---------- demo-mode in-memory complaints (never persisted, never mixed with DB rows) ----------
let demoComplaints: Complaint[] = mock.initialIncidents.map((i) => ({
  ...i, complaintNo: i.id, dbId: i.id, status: i.status === "Reported" ? "Submitted" : i.status, isDemo: true,
}));

export function computeStats(list: Complaint[]): IncidentStats {
  const count = (k: (c: Complaint) => string) => list.reduce<Record<string, number>>((a, c) => ((a[k(c)] = (a[k(c)] ?? 0) + 1), a), {});
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);
  const hrs = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 3.6e6;
  return {
    total: list.length,
    open: list.filter((c) => c.status !== "Resolved").length,
    urgent: list.filter((c) => (c.severity === "High" || c.severity === "Critical") && c.status !== "Resolved").length,
    resolved: list.filter((c) => c.status === "Resolved").length,
    avg_response_hours: avg(list.filter((c) => c.reviewedAt).map((c) => hrs(c.reportedAt, c.reviewedAt!))),
    avg_resolution_hours: avg(list.filter((c) => c.resolvedAt).map((c) => hrs(c.reportedAt, c.resolvedAt!))),
    by_category: count((c) => c.category), by_status: count((c) => c.status), by_severity: count((c) => c.severity),
    by_department: count((c) => c.assignedDepartment ?? "Unassigned"),
  };
}

// ---------- assets ----------
export async function listAssets(): Promise<CityAsset[]> {
  if (isDemo) return mock.assets.map((a) => ({ ...a, verification: "Sample record (demonstration) — location approximate" }));
  const { data, error } = await db().from("city_assets").select("*").order("name");
  fail(error);
  return (data ?? []).map(toAsset);
}

export async function assetCounts(): Promise<{ total: number; byCategory: Record<string, number>; verified: number }> {
  const list = await listAssets();
  const byCategory: Record<string, number> = {};
  list.forEach((a) => (byCategory[a.category] = (byCategory[a.category] ?? 0) + 1));
  return { total: list.length, byCategory, verified: list.filter((a) => a.verification === "Verified record").length };
}

// ---------- complaints ----------
export interface NewComplaint {
  title: string; description: string; category: IncidentCategory; severity: Severity;
  address: string; lat: number; lng: number; photo?: File | null;
}

export async function createComplaint(input: NewComplaint, userId: string): Promise<Complaint> {
  if (isDemo) {
    const n = demoComplaints.length + 1;
    const c: Complaint = {
      id: `DEMO-${String(n).padStart(3, "0")}`, complaintNo: `DEMO-${String(n).padStart(3, "0")}`, title: input.title,
      description: input.description, category: input.category, severity: input.severity, status: "Submitted",
      location: input.address, address: input.address, position: [input.lat, input.lng], reportedAt: new Date().toISOString(), isDemo: true, reporterId: userId,
    };
    demoComplaints = [c, ...demoComplaints];
    return c;
  }
  let imagePath: string | null = null;
  if (input.photo) {
    const ext = input.photo.type === "image/png" ? "png" : input.photo.type === "image/webp" ? "webp" : "jpg";
    imagePath = `${userId}/${crypto.randomUUID()}.${ext}`;
    const up = await db().storage.from("complaint-photos").upload(imagePath, input.photo, { contentType: input.photo.type });
    fail(up.error);
  }
  const { data, error } = await db().from("incidents").insert({
    title: input.title, description: input.description, category: input.category, severity: input.severity,
    address: input.address || null, lat: input.lat, lng: input.lng, image_path: imagePath,
  }).select("*").single();
  fail(error);
  return toComplaint(data);
}

export async function listMyComplaints(userId: string): Promise<Complaint[]> {
  if (isDemo) return demoComplaints.filter((c) => c.reporterId === userId);
  const { data, error } = await db().from("incidents").select("*").eq("reporter_id", userId).order("created_at", { ascending: false });
  fail(error);
  return (data ?? []).map(toComplaint);
}

/** Municipal / oversight view. RLS decides what is actually returned. */
export async function listAllComplaints(): Promise<Complaint[]> {
  if (isDemo) return demoComplaints;
  const { data, error } = await db().from("incidents").select("*").order("created_at", { ascending: false });
  fail(error);
  return (data ?? []).map(toComplaint);
}

/** PII-free public feed (no reporter, no free text). */
export async function listPublicIncidents(): Promise<Complaint[]> {
  if (isDemo) return demoComplaints;
  const { data, error } = await db().from("public_incidents").select("*").order("created_at", { ascending: false }).limit(200);
  fail(error);
  return (data ?? []).map((r: any) => toComplaint({ ...r, id: r.complaint_no, description: "" }));
}

export async function listUpdates(dbId: string): Promise<IncidentUpdate[]> {
  if (isDemo) return [];
  const { data, error } = await db().from("incident_updates").select("*").eq("incident_id", dbId).order("created_at");
  fail(error);
  return (data ?? []).map((r: any) => ({
    id: r.id, incidentId: r.incident_id, kind: r.kind, fromStatus: r.from_status, toStatus: r.to_status,
    message: r.message, isInternal: r.is_internal, createdAt: r.created_at,
  }));
}

export async function photoUrl(path: string): Promise<string | null> {
  if (isDemo) return null;
  const { data, error } = await db().storage.from("complaint-photos").createSignedUrl(path, 300);
  return error ? null : data.signedUrl;
}

// ---------- workflow (server-side RPCs) ----------
export async function transitionComplaint(dbId: string, to: IncidentStatus, publicMessage?: string, internalNote?: string) {
  if (isDemo) {
    demoComplaints = demoComplaints.map((c) => (c.dbId === dbId ? { ...c, status: to, reviewedAt: to === "Under Review" ? new Date().toISOString() : c.reviewedAt, resolvedAt: to === "Resolved" ? new Date().toISOString() : c.resolvedAt } : c));
    return;
  }
  const { error } = await db().rpc("transition_incident", { p_incident: dbId, p_to: to, p_public_message: publicMessage ?? null, p_internal_note: internalNote ?? null });
  fail(error);
}
export async function assignComplaint(dbId: string, department: string, assignee?: string | null) {
  if (isDemo) { demoComplaints = demoComplaints.map((c) => (c.dbId === dbId ? { ...c, assignedDepartment: department } : c)); return; }
  const { error } = await db().rpc("assign_incident", { p_incident: dbId, p_department: department, p_assignee: assignee ?? null });
  fail(error);
}
export async function addNote(dbId: string, message: string, internal: boolean) {
  if (isDemo) return;
  const { error } = await db().rpc("add_incident_note", { p_incident: dbId, p_message: message, p_internal: internal });
  fail(error);
}

export async function getStats(from?: string, to?: string): Promise<IncidentStats> {
  if (isDemo) return computeStats(demoComplaints);
  const { data, error } = await db().rpc("incident_stats", { p_from: from ?? null, p_to: to ?? null });
  fail(error);
  return data as IncidentStats;
}

// ---------- notifications ----------
const toNotif = (r: any): AppNotification => ({ id: r.id, type: r.type, incidentId: r.incident_id, title: r.title, body: r.body, isRead: r.is_read, createdAt: r.created_at });
export async function listNotifications(): Promise<AppNotification[]> {
  if (isDemo) return [];
  const { data, error } = await db().from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
  fail(error);
  return (data ?? []).map(toNotif);
}
export async function markNotificationRead(id: string) {
  if (isDemo) return;
  const { error } = await db().from("notifications").update({ is_read: true }).eq("id", id);
  fail(error);
}
export async function markAllRead() {
  if (isDemo) return;
  const { error } = await db().from("notifications").update({ is_read: true }).eq("is_read", false);
  fail(error);
}
/** Realtime: RLS still filters, but we also scope by recipient. Returns an unsubscribe function. */
export function subscribeNotifications(userId: string, onChange: () => void): () => void {
  if (!supabase) return () => {};
  const ch = supabase.channel(`notif-${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` }, onChange)
    .subscribe();
  return () => { supabase!.removeChannel(ch); };
}
export function subscribeIncidents(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const ch = supabase.channel("incidents-live").on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, onChange).subscribe();
  return () => { supabase!.removeChannel(ch); };
}

// ---------- scenarios & audit ----------
export async function saveScenario(name: string, parameters: Record<string, number>, results: { metric: string; unit: string; baseline: number; estimate: number }[], userId: string) {
  if (isDemo) throw new Error("Demo mode: scenarios are not saved.");
  const { data, error } = await db().from("scenarios").insert({ name, parameters, created_by: userId, assumptions: { note: "Illustrative model, hypothetical baseline" } }).select("id").single();
  fail(error);
  const { error: e2 } = await db().from("scenario_results").insert(results.map((r) => ({ ...r, scenario_id: data!.id })));
  fail(e2);
}
export async function listAuditLogs() {
  if (isDemo) return mock.auditLogs.map((l) => ({ id: l.id, action: l.action, target: l.target, at: l.at, actor: l.actor }));
  const { data, error } = await db().from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50);
  fail(error);
  return (data ?? []).map((r: any) => ({ id: r.id, action: r.action, target: r.target_id ?? "", at: r.created_at, actor: r.actor_id ?? "system" }));
}
export async function listStaff(): Promise<{ id: string; name: string; department: string | null }[]> {
  if (isDemo) return [];
  const { data, error } = await db().from("profiles").select("id, display_name, department").in("role", ["municipal_staff", "mayor"]);
  fail(error);
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.display_name, department: r.department }));
}

export const DEPARTMENTS = ["Roads & Works", "Water & Sanitation", "Drainage", "Electricity Liaison", "Solid Waste", "Street Lighting", "Public Safety Liaison"];

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  // prefix formula-leading chars to prevent CSV/Excel injection
  const cell = (v: unknown) => { let s = String(v ?? ""); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}
