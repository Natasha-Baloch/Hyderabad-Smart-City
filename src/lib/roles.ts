import type { AppRole } from "./types";

export type Permission =
  | "complaint.create" | "complaint.read_own" | "complaint.read_all" | "complaint.assign"
  | "complaint.transition" | "complaint.internal_notes" | "assets.manage" | "oversight.read"
  | "reports.export" | "audit.read" | "roles.provision";

/** UI-side description of permissions. The database (RLS + RPCs) is the real enforcement point. */
export const PERMISSIONS: Record<AppRole, Permission[]> = {
  citizen: ["complaint.create", "complaint.read_own"],
  municipal_staff: ["complaint.read_all", "complaint.assign", "complaint.transition", "complaint.internal_notes"],
  mayor: ["complaint.read_all", "complaint.assign", "complaint.transition", "complaint.internal_notes", "assets.manage", "audit.read", "reports.export"],
  chief_minister: ["oversight.read", "reports.export", "audit.read"],
  system_admin: ["complaint.read_all", "complaint.assign", "complaint.transition", "complaint.internal_notes", "assets.manage", "oversight.read", "audit.read", "roles.provision"],
};

export const can = (role: AppRole | null | undefined, p: Permission) => !!role && PERMISSIONS[role].includes(p);

export const HOME_FOR_ROLE: Record<AppRole, string> = {
  citizen: "/citizen",
  municipal_staff: "/mayor",
  mayor: "/mayor",
  chief_minister: "/minister",
  system_admin: "/mayor",
};

export type RoleChoice = "citizen" | "mayor" | "chief_minister";
export const ROLE_CHOICES: { key: RoleChoice; title: string; text: string; signup: boolean }[] = [
  { key: "citizen", title: "Citizen / Local Resident", text: "Report problems, pin them on the map and follow each complaint through to resolution.", signup: true },
  { key: "mayor", title: "Mayor of Hyderabad", text: "Municipal operations: triage, assign and resolve complaints, with response-time analytics.", signup: false },
  { key: "chief_minister", title: "Chief Minister of Sindh", text: "Read-only governance oversight of Hyderabad performance, trends and reports.", signup: false },
];

/** Which roles may enter which role-scoped area. */
export const AREA_ROLES: Record<RoleChoice, AppRole[]> = {
  citizen: ["citizen"],
  mayor: ["mayor", "municipal_staff", "system_admin"],
  chief_minister: ["chief_minister", "system_admin"],
};
