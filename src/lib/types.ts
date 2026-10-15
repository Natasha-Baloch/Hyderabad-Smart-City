// Domain types — shaped to map 1:1 onto future database tables.

export type Role = "Administrator" | "Staff" | "Viewer";
/** Legacy demo-profile shape used by the demo Admin page. */
export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "Active" | "Inactive";
}

/** Real application roles — mirror the `app_role` enum in Postgres. */
export type AppRole = "citizen" | "municipal_staff" | "mayor" | "chief_minister" | "system_admin";

export interface CityArea {
  id: string;
  name: string;
  center: [number, number];
}

export type AssetCategory = "roads" | "education" | "healthcare" | "water" | "other";
export interface CityAsset {
  id: string;
  name: string;
  category: AssetCategory;
  type: string;
  areaId: string;
  position: [number, number];
  status: "Operational" | "Maintenance" | "Offline";
  facilities?: string;
  verification?: string;
}

export interface SensorReading {
  id: string;
  assetId: string;
  metric: string;
  value: number;
  unit: string;
  recordedAt: string;
}

export const COMPLAINT_CATEGORIES = ["Roads", "Water", "Drainage", "Electricity", "Waste", "Streetlights", "Public Safety", "Other"] as const;
export type IncidentCategory = (typeof COMPLAINT_CATEGORIES)[number] | "Water & Sanitation";
export type Severity = "Low" | "Medium" | "High" | "Critical";
export const WORKFLOW = ["Submitted", "Under Review", "Assigned", "In Progress", "Resolved"] as const;
export type IncidentStatus = (typeof WORKFLOW)[number] | "Reopened" | "Reported" | "Pending" | "Accepted" | "Completed" | "Rejected";
export interface Incident {
  id: string;
  title: string;
  category: IncidentCategory;
  severity: Severity;
  status: IncidentStatus;
  location: string;
  position: [number, number];
  description: string;
  reportedAt: string;
  isDemo?: boolean;
}

/** DB-backed complaint (private view for reporter / municipal staff). */
export interface Complaint extends Incident {
  complaintNo: string;
  /** database UUID (id holds the human-readable complaint number) */
  dbId?: string;
  reporterId?: string;
  address?: string;
  imagePath?: string | null;
  assignedDepartment?: string | null;
  reviewedAt?: string | null;
  resolvedAt?: string | null;
}
export interface IncidentUpdate {
  id: string;
  incidentId: string;
  kind: "status_change" | "public_update" | "internal_note" | "resolution";
  fromStatus?: IncidentStatus | null;
  toStatus?: IncidentStatus | null;
  message?: string | null;
  isInternal: boolean;
  createdAt: string;
}
export interface AppNotification {
  id: string;
  type: string;
  incidentId?: string | null;
  title: string;
  body?: string | null;
  isRead: boolean;
  createdAt: string;
}
export interface IncidentStats {
  total: number; open: number; urgent: number; resolved: number;
  avg_response_hours: number | null; avg_resolution_hours: number | null;
  by_category: Record<string, number>; by_status: Record<string, number>;
  by_severity: Record<string, number>; by_department: Record<string, number>;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  parameterLabel: string;
}

export interface ScenarioResult {
  metric: string;
  unit: string;
  baseline: number;
  estimate: number;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
}
