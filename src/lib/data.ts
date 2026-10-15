// Data access layer. UI components read through here only, so mock data can
// later be swapped for database queries without touching components.
import { useSyncExternalStore } from "react";
import * as mock from "@/data/mock";
import type { Incident } from "./types";

let incidents: Incident[] = mock.initialIncidents;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const incidentStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => incidents,
  add(input: Omit<Incident, "id" | "reportedAt" | "status">) {
    const next = incidents.length + 1;
    const item: Incident = {
      ...input,
      id: `INC-${String(next).padStart(3, "0")}`,
      status: "Reported",
      reportedAt: new Date().toISOString(),
    };
    incidents = [item, ...incidents];
    emit();
    return item;
  },
  updateStatus(id: string, status: Incident["status"]) {
    incidents = incidents.map((i) => (i.id === id ? { ...i, status } : i));
    emit();
  },
};

export function useIncidents() {
  return useSyncExternalStore(incidentStore.subscribe, incidentStore.get, incidentStore.get);
}

export const getAssets = () => mock.assets;
export const getAreas = () => mock.areas;
export const getProfiles = () => mock.profiles;
export const getAuditLogs = () => mock.auditLogs;
export const getIncidentTrend = () => mock.incidentTrend;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
