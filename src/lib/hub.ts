// "Hub" = the local, browser-stored backend that powers the three role experiences
// (Citizen / Mayor of Hyderabad / Government of Sindh) with no server or API keys.
//
//  - Data lives in localStorage, so every tab of the same browser sees the same complaints.
//    Open the citizen in one tab and the mayor in another to watch the flow live.
//  - The login SESSION lives in sessionStorage, so each tab can be signed in as a different role.
//  - This is a demo/prototype store. For production, replace these functions with Supabase calls
//    (the Supabase schema in /supabase is still included).
import { useSyncExternalStore } from "react";

export type HubRole = "citizen" | "mayor" | "govt";
export type ComplaintState = "Pending" | "Accepted" | "In Progress" | "Completed" | "Rejected";

export interface HubUser { id: string; name: string; city: string; role: "citizen"; passHash: string; email?: string }
export interface HubFeedback { rating: number; comment: string; at: string }
export interface HubComplaint {
  id: string; no: string; citizenId: string; citizenName: string; city: string;
  title: string; description: string; category: string; severity: "Low" | "Medium" | "High" | "Critical";
  address: string; lat: number; lng: number; photo: string | null; createdAt: string;
  state: ComplaintState; decidedAt?: string; completedAt?: string; feedback?: HubFeedback; sample?: boolean;
}
export interface HubMessage {
  id: string; complaintId: string; from: "citizen" | "mayor" | "system"; author: string; text: string; at: string;
  kind: "submitted" | "message" | "decision" | "progress" | "feedback";
}
export interface HubNotice { id: string; toRole: HubRole; toUserId?: string; title: string; body: string; complaintId: string; at: string; read: boolean }
export interface HubDB { users: HubUser[]; complaints: HubComplaint[]; messages: HubMessage[]; notices: HubNotice[]; seq: number }
export interface HubSession { role: HubRole; userId: string; name: string; city: string }

/**
 * Official accounts. These two are NOT self-registered. Change the passwords here before sharing the app.
 * (A real deployment must verify officials on a server — this check runs in the browser.)
 */
export const OFFICIALS: Record<"mayor" | "govt", { city: string; password: string; userId: string; title: string }> = {
  mayor: { city: "hyderabad", password: "mayor@123", userId: "official-mayor", title: "Mayor of Hyderabad" },
  govt: { city: "sindh", password: "sindh@123", userId: "official-govt", title: "Government of Sindh" },
};

export const CITY_SUGGESTIONS = ["Hyderabad", "Karachi", "Sukkur", "Larkana", "Mirpurkhas", "Nawabshah", "Jamshoro", "Thatta", "Kotri"];

const DB_KEY = "hdt.hub.v1";
const SESSION_KEY = "hdt.hub.session.v1";
const EMPTY_DB: HubDB = { users: [], complaints: [], messages: [], notices: [], seq: 0 };

const isBrowser = typeof window !== "undefined";
const uid = () => (isBrowser && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const nowIso = () => new Date().toISOString();

// ---------- password hashing (demo-grade) ----------
export async function hashPassword(pw: string): Promise<string> {
  const data = new TextEncoder().encode(`hdt-salt:${pw}`);
  if (isBrowser && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `plain:${pw}`;
}

// ---------- seed data (clearly labelled sample) ----------
function seed(): HubDB {
  const t = (d: number, h = 9) => new Date(Date.UTC(2026, 9, d, h - 5, 0)).toISOString();
  const mk = (n: number, title: string, category: string, severity: HubComplaint["severity"], state: ComplaintState, address: string, lat: number, lng: number, createdAt: string, description: string): HubComplaint => ({
    id: `seed-${n}`, no: `HYD-${String(n).padStart(4, "0")}`, citizenId: "sample-resident", citizenName: "Sample resident", city: "Hyderabad",
    title, description, category, severity, address, lat, lng, photo: null, createdAt, state, sample: true,
  });
  const complaints: HubComplaint[] = [
    mk(1, "Pothole on main road", "Roads", "High", "In Progress", "Hyderabad City, main road", 25.394, 68.36, t(8), "Large pothole causing traffic disruption near the market."),
    mk(2, "Water leakage near houses", "Water", "Medium", "Pending", "Latifabad Unit 6", 25.368, 68.372, t(8, 8), "Pipeline leakage near the residential block."),
    mk(3, "Street light not working", "Streetlights", "Low", "Completed", "Hyderabad City", 25.399, 68.37, t(6, 18), "Street light has been out for several nights."),
    mk(4, "Garbage overflow", "Waste", "Medium", "Rejected", "Latifabad", 25.362, 68.381, t(5, 16), "Collection point overflowing."),
    mk(5, "Blocked drain, flooding risk", "Drainage", "High", "Accepted", "Near the river, Kotri side", 25.386, 68.343, t(4, 11), "Blocked drain may cause flooding in the rains."),
  ];
  complaints[2].completedAt = t(9, 12); complaints[2].decidedAt = t(7);
  complaints[2].feedback = { rating: 5, comment: "Fixed quickly, thank you!", at: t(10) };
  complaints[3].decidedAt = t(6);
  complaints[4].decidedAt = t(5); complaints[0].decidedAt = t(8, 12);
  const m = (cid: string, from: HubMessage["from"], author: string, text: string, at: string, kind: HubMessage["kind"]): HubMessage => ({ id: uid(), complaintId: cid, from, author, text, at, kind });
  const messages: HubMessage[] = [
    ...complaints.map((c) => m(c.id, "system", "System", `Complaint ${c.no} submitted: ${c.title}`, c.createdAt, "submitted")),
    m("seed-1", "mayor", "Mayor's office", "Accepted. A road crew is being sent this week.", t(8, 12), "decision"),
    m("seed-1", "citizen", "Sample resident", "Thank you. It is getting worse when it rains.", t(8, 14), "message"),
    m("seed-3", "mayor", "Mayor's office", "Accepted. The electricity team will replace the lamp.", t(7), "decision"),
    m("seed-3", "mayor", "Mayor's office", "Work completed. The light is working again.", t(9, 12), "progress"),
    m("seed-3", "citizen", "Sample resident", "Fixed quickly, thank you! (5/5)", t(10), "feedback"),
    m("seed-4", "mayor", "Mayor's office", "Not accepted: this point is already on the weekly collection route. Please report again if it continues.", t(6), "decision"),
    m("seed-5", "mayor", "Mayor's office", "Accepted. We are preparing the drain-cleaning work.", t(5), "decision"),
  ];
  return { users: [], complaints, messages, notices: [], seq: 5 };
}

// ---------- reactive storage ----------
let cache: HubDB | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function readDb(): HubDB {
  if (!isBrowser) return EMPTY_DB;
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(DB_KEY);
    cache = raw ? (JSON.parse(raw) as HubDB) : seed();
    if (!raw) localStorage.setItem(DB_KEY, JSON.stringify(cache));
  } catch {
    cache = seed();
  }
  return cache;
}

function writeDb(next: HubDB) {
  cache = next;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(next));
  } catch {
    throw new Error("Browser storage is full. Remove a photo or clear old data and try again.");
  } finally {
    emit();
  }
}

if (isBrowser) {
  window.addEventListener("storage", (e) => {
    if (e.key === DB_KEY) { cache = null; emit(); }
    if (e.key === SESSION_KEY) { sessionCache = undefined; emit(); }
  });
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useHub = (): HubDB => useSyncExternalStore(subscribe, readDb, () => EMPTY_DB);

/** Wipe all demo data (back to the sample set). */
export function resetHub() { writeDb(seed()); }

// ---------- session ----------
let sessionCache: HubSession | null | undefined;
function readSession(): HubSession | null {
  if (!isBrowser) return null;
  if (sessionCache !== undefined) return sessionCache;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    sessionCache = raw ? (JSON.parse(raw) as HubSession) : null;
  } catch { sessionCache = null; }
  return sessionCache;
}
function setSession(s: HubSession | null) {
  sessionCache = s;
  try { if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); else sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  emit();
}
export const useSession = (): HubSession | null => useSyncExternalStore(subscribe, readSession, () => null);
export const signOutHub = () => setSession(null);

export const HOME_FOR: Record<HubRole, string> = { citizen: "/citizen", mayor: "/mayor", govt: "/minister" };
export const ROLE_TITLE: Record<HubRole, string> = { citizen: "People of Hyderabad", mayor: "Mayor of Hyderabad", govt: "Government of Sindh" };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

// ---------- auth ----------
export async function registerCitizen(name: string, city: string, password: string): Promise<void> {
  const db = readDb();
  if (db.users.some((u) => norm(u.name) === norm(name) && norm(u.city) === norm(city))) throw new Error("An account with this name and city already exists. Please sign in.");
  const user: HubUser = { id: uid(), name: name.trim(), city: city.trim(), role: "citizen", passHash: await hashPassword(password) };
  writeDb({ ...readDb(), users: [...readDb().users, user] });
  setSession({ role: "citizen", userId: user.id, name: user.name, city: user.city });
}

export async function loginCitizen(name: string, city: string, password: string): Promise<void> {
  const h = await hashPassword(password);
  const u = readDb().users.find((x) => norm(x.name) === norm(name) && norm(x.city) === norm(city));
  if (!u || u.passHash !== h) throw new Error("Name, city or password is not correct.");
  setSession({ role: "citizen", userId: u.id, name: u.name, city: u.city });
}

/** Demo "Continue with Google": no real Google account is contacted. */
export async function googleDemoLogin(email: string, name: string, city: string): Promise<void> {
  const db = readDb();
  let u = db.users.find((x) => x.email && norm(x.email) === norm(email));
  if (!u) {
    u = { id: uid(), name: name.trim(), city: city.trim() || "Hyderabad", role: "citizen", passHash: await hashPassword(uid()), email: email.trim() };
    writeDb({ ...db, users: [...db.users, u] });
  }
  setSession({ role: "citizen", userId: u.id, name: u.name, city: u.city });
}

export async function loginOfficial(role: "mayor" | "govt", name: string, city: string, password: string): Promise<void> {
  const o = OFFICIALS[role];
  if (norm(city) !== o.city || password !== o.password) throw new Error("City or password is not correct for this official account.");
  setSession({ role, userId: o.userId, name: name.trim() || o.title, city: role === "mayor" ? "Hyderabad" : "Sindh" });
}

// ---------- complaints ----------
export interface NewHubComplaint { title: string; description: string; category: string; severity: HubComplaint["severity"]; address: string; lat: number; lng: number; photo: string | null }

export function submitComplaint(s: HubSession, input: NewHubComplaint): HubComplaint {
  const db = readDb();
  const seq = db.seq + 1;
  const at = nowIso();
  const c: HubComplaint = {
    id: uid(), no: `HYD-${String(seq).padStart(4, "0")}`, citizenId: s.userId, citizenName: s.name, city: s.city,
    ...input, createdAt: at, state: "Pending",
  };
  const msg: HubMessage = { id: uid(), complaintId: c.id, from: "citizen", author: s.name, text: `${input.title} — ${input.description}`, at, kind: "submitted" };
  const toMayor: HubNotice = { id: uid(), toRole: "mayor", title: `New complaint ${c.no}`, body: `${s.name} (${s.city}): ${input.title}`, complaintId: c.id, at, read: false };
  const toCitizen: HubNotice = { id: uid(), toRole: "citizen", toUserId: s.userId, title: `Complaint ${c.no} received`, body: "Your complaint was sent to the Mayor's notifications. You will get a reply here.", complaintId: c.id, at, read: false };
  writeDb({ ...db, seq, complaints: [c, ...db.complaints], messages: [...db.messages, msg], notices: [toMayor, toCitizen, ...db.notices] });
  return c;
}

function patchComplaint(id: string, patch: Partial<HubComplaint>, msg: Omit<HubMessage, "id" | "at" | "complaintId">, notice?: Omit<HubNotice, "id" | "at" | "read" | "complaintId">) {
  const db = readDb();
  const at = nowIso();
  const complaints = db.complaints.map((c) => (c.id === id ? { ...c, ...patch } : c));
  const messages = [...db.messages, { ...msg, id: uid(), at, complaintId: id }];
  const notices = notice ? [{ ...notice, id: uid(), at, read: false, complaintId: id }, ...db.notices] : db.notices;
  writeDb({ ...db, complaints, messages, notices });
}

const mayorName = (s: HubSession) => (s.name ? `${s.name} (Mayor)` : "Mayor's office");

/** Mayor accepts ("we are getting it ready") or rejects ("this has been done / not possible"). */
export function decideComplaint(s: HubSession, c: HubComplaint, decision: "Accepted" | "Rejected", note: string) {
  const text = note.trim() || (decision === "Accepted" ? "Accepted. We are getting this ready." : "Not accepted. This request cannot be taken forward.");
  patchComplaint(c.id, { state: decision, decidedAt: nowIso() },
    { from: "mayor", author: mayorName(s), text, kind: "decision" },
    { toRole: "citizen", toUserId: c.citizenId, title: `Complaint ${c.no} ${decision.toLowerCase()}`, body: text });
}

export function updateProgress(s: HubSession, c: HubComplaint, state: "In Progress" | "Completed", note: string) {
  const text = note.trim() || (state === "Completed" ? "Work completed." : "Work has started.");
  patchComplaint(c.id, { state, ...(state === "Completed" ? { completedAt: nowIso() } : {}) },
    { from: "mayor", author: mayorName(s), text, kind: "progress" },
    { toRole: "citizen", toUserId: c.citizenId, title: `Complaint ${c.no}: ${state}`, body: text });
}

export function sendMessage(s: HubSession, c: HubComplaint, text: string) {
  const t = text.trim();
  if (!t) return;
  const fromMayor = s.role === "mayor";
  patchComplaint(c.id, {},
    { from: fromMayor ? "mayor" : "citizen", author: fromMayor ? mayorName(s) : s.name, text: t, kind: "message" },
    fromMayor
      ? { toRole: "citizen", toUserId: c.citizenId, title: `Reply on ${c.no}`, body: t }
      : { toRole: "mayor", title: `New message on ${c.no}`, body: `${s.name}: ${t}` });
}

export function giveFeedback(s: HubSession, c: HubComplaint, rating: number, comment: string) {
  const fb: HubFeedback = { rating, comment: comment.trim(), at: nowIso() };
  patchComplaint(c.id, { feedback: fb },
    { from: "citizen", author: s.name, text: `Feedback: ${rating}/5${fb.comment ? ` — ${fb.comment}` : ""}`, kind: "feedback" },
    { toRole: "mayor", title: `Feedback on ${c.no}`, body: `${s.name} rated the work ${rating}/5.` });
}

export function markNoticesRead(role: HubRole, userId: string) {
  const db = readDb();
  const mine = (n: HubNotice) => n.toRole === role && (n.toRole !== "citizen" || n.toUserId === userId);
  if (!db.notices.some((n) => mine(n) && !n.read)) return;
  writeDb({ ...db, notices: db.notices.map((n) => (mine(n) ? { ...n, read: true } : n)) });
}

export function noticesFor(db: HubDB, s: HubSession): HubNotice[] {
  return db.notices.filter((n) => n.toRole === s.role && (s.role !== "citizen" || n.toUserId === s.userId));
}

// ---------- photos ----------
/** Resize to max 900px JPEG so many complaints fit in browser storage. */
export function fileToSmallDataUrl(file: File, max = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const ctx = c.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); return reject(new Error("Could not read the photo.")); }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read the photo.")); };
    img.src = url;
  });
}

export const DONE_STATES: ComplaintState[] = ["Completed"];
export const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
