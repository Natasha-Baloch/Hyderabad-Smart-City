// SAMPLE DATA ONLY — illustrative records for demonstration.
// Locations are approximate placements around Hyderabad, Sindh and are NOT official data.
import type { AuditLog, CityArea, CityAsset, Incident, Profile, Scenario } from "@/lib/types";

export const HYDERABAD_CENTER: [number, number] = [25.396, 68.3578];

export const areas: CityArea[] = [
  { id: "latifabad", name: "Latifabad", center: [25.37, 68.37] },
  { id: "qasimabad", name: "Qasimabad", center: [25.405, 68.325] },
  { id: "city", name: "Hyderabad City", center: [25.392, 68.365] },
  { id: "kotri", name: "Near Kotri bridge", center: [25.38, 68.33] },
];

const baseAssets: CityAsset[] = [
  { id: "A-101", name: "Sample School A", category: "education", type: "Educational Institution", areaId: "city", position: [25.398, 68.366], status: "Operational", facilities: "Classrooms, Library" },
  { id: "A-102", name: "Sample College B", category: "education", type: "Educational Institution", areaId: "qasimabad", position: [25.41, 68.33], status: "Operational", facilities: "Labs, Playground" },
  { id: "A-201", name: "Sample Hospital C", category: "healthcare", type: "Healthcare Facility", areaId: "city", position: [25.389, 68.372], status: "Operational", facilities: "Emergency, OPD" },
  { id: "A-202", name: "Sample Clinic D", category: "healthcare", type: "Healthcare Facility", areaId: "latifabad", position: [25.365, 68.378], status: "Maintenance" },
  { id: "A-301", name: "Sample Water Plant E", category: "water", type: "Water Infrastructure", areaId: "kotri", position: [25.383, 68.338], status: "Operational" },
  { id: "A-302", name: "Sample Pumping Station F", category: "water", type: "Water Infrastructure", areaId: "latifabad", position: [25.358, 68.362], status: "Offline" },
  { id: "A-401", name: "Sample Arterial Road G", category: "roads", type: "Road Segment", areaId: "city", position: [25.402, 68.357], status: "Operational" },
  { id: "A-402", name: "Sample Bypass H", category: "roads", type: "Road Segment", areaId: "qasimabad", position: [25.418, 68.345], status: "Maintenance" },
  { id: "A-501", name: "Sample Park I", category: "other", type: "Public Space", areaId: "latifabad", position: [25.375, 68.385], status: "Operational" },
];

const gen = (prefix: string, name: string, category: CityAsset["category"], type: string, n: number): CityAsset[] =>
  Array.from({ length: n }, (_, i) => {
    const a = areas[i % areas.length];
    return {
      id: `${prefix}-${i + 1}`, name: `Sample ${name} ${i + 3}`, category, type, areaId: a.id,
      position: [a.center[0] + (((i * 37 + prefix.length * 11) % 20) - 10) / 1000, a.center[1] + (((i * 53 + prefix.length * 7) % 20) - 10) / 1000] as [number, number],
      status: i % 7 === 3 ? "Maintenance" : "Operational",
    };
  });

/** SAMPLE counts for the demo — replace with verified municipal records before any real use. */
export const assets: CityAsset[] = [
  ...baseAssets,
  ...gen("SCH", "School", "education", "Educational Institution", 10),
  ...gen("RD", "Road", "roads", "Road Segment", 8),
  ...gen("HOS", "Health Centre", "healthcare", "Healthcare Facility", 6),
  ...gen("WTR", "Water Point", "water", "Water Infrastructure", 3),
  ...gen("PRK", "Park", "other", "Public Space", 4),
];

export const initialIncidents: Incident[] = [
  { id: "INC-001", title: "Pothole on main road", category: "Roads", severity: "High", status: "In Progress", location: "Sample location, Hyderabad City", position: [25.394, 68.36], description: "Large pothole causing traffic disruption.", reportedAt: "2026-10-08T09:14:00" },
  { id: "INC-002", title: "Water leakage", category: "Water & Sanitation", severity: "Medium", status: "Reported", location: "Sample location, Latifabad", position: [25.368, 68.372], description: "Pipeline leakage near residential block.", reportedAt: "2026-10-08T08:32:00" },
  { id: "INC-003", title: "Power outage", category: "Electricity", severity: "High", status: "In Progress", location: "Sample location, Qasimabad", position: [25.407, 68.328], description: "Area-wide outage reported by residents.", reportedAt: "2026-10-07T07:20:00" },
  { id: "INC-004", title: "Street light not working", category: "Public Safety", severity: "Low", status: "Resolved", location: "Sample location, Hyderabad City", position: [25.399, 68.37], description: "Street light out for several nights.", reportedAt: "2026-10-06T18:45:00" },
  { id: "INC-005", title: "Garbage overflow", category: "Other", severity: "Medium", status: "Reported", location: "Sample location, Latifabad", position: [25.362, 68.381], description: "Collection point overflowing.", reportedAt: "2026-10-05T16:12:00" },
  { id: "INC-006", title: "Flooding risk", category: "Water & Sanitation", severity: "High", status: "Reported", location: "Sample location, near river", position: [25.386, 68.343], description: "Blocked drain may cause flooding.", reportedAt: "2026-10-04T11:00:00" },
];

export const incidentTrend = [
  { day: "Oct 2", count: 3 }, { day: "Oct 3", count: 5 }, { day: "Oct 4", count: 4 },
  { day: "Oct 5", count: 6 }, { day: "Oct 6", count: 3 }, { day: "Oct 7", count: 5 }, { day: "Oct 8", count: 4 },
];

export const profiles: Profile[] = [
  { id: "u1", name: "Admin User", email: "admin@example.com", role: "Administrator", status: "Active" },
  { id: "u2", name: "City Staff", email: "staff@example.com", role: "Staff", status: "Active" },
  { id: "u3", name: "Viewer", email: "viewer@example.com", role: "Viewer", status: "Inactive" },
];

export const auditLogs: AuditLog[] = [
  { id: "L1", actor: "Admin User", action: "Updated status", target: "INC-001", at: "2026-10-08 10:02" },
  { id: "L2", actor: "City Staff", action: "Created incident", target: "INC-002", at: "2026-10-08 08:33" },
  { id: "L3", actor: "Admin User", action: "Added asset", target: "A-302", at: "2026-10-07 15:40" },
  { id: "L4", actor: "City Staff", action: "Resolved incident", target: "INC-004", at: "2026-10-07 09:12" },
];

export const trafficScenario: Scenario = {
  id: "traffic",
  name: "Traffic congestion reduction",
  description: "What if traffic congestion in the city were reduced?",
  parameterLabel: "Reduction percentage",
};

// Hypothetical baseline values used only by the simulation demo.
export const trafficBaseline = { travelTime: 28, emissions: 1200, volume: 85000 };

export const DATA_SOURCE = "Sample data (demo)";
export const LAST_UPDATED = "2026-10-08T10:24:00";
