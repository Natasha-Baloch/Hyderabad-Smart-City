import type { HubComplaint } from "@/lib/hub";
import type { CityAsset, Incident, IncidentCategory, IncidentStatus } from "@/lib/types";

export const toIncident = (c: HubComplaint): Incident => ({
  id: c.no, title: c.title, category: c.category as IncidentCategory, severity: c.severity, status: c.state as IncidentStatus,
  location: c.address, position: [c.lat, c.lng], description: c.description, reportedAt: c.createdAt, isDemo: !!c.sample,
});

export function countAssets(assets: CityAsset[]) {
  const by = (cat: CityAsset["category"]) => assets.filter((a) => a.category === cat).length;
  return { schools: by("education"), roads: by("roads"), healthcare: by("healthcare"), water: by("water"), parks: by("other"), total: assets.length };
}
