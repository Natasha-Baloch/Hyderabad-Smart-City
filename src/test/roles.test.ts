import { describe, expect, it } from "vitest";
import { AREA_ROLES, HOME_FOR_ROLE, can } from "@/lib/roles";
import { computeStats, toCsv } from "@/lib/api";
import { validateDraft, emptyDraft } from "@/components/app/ComplaintForm";
import { esc } from "@/components/app/CityMapLeaflet";
import type { Complaint } from "@/lib/types";

describe("role permissions (UI mirror of DB policy)", () => {
  it("citizens cannot assign, resolve or read all complaints", () => {
    expect(can("citizen", "complaint.assign")).toBe(false);
    expect(can("citizen", "complaint.transition")).toBe(false);
    expect(can("citizen", "complaint.read_all")).toBe(false);
    expect(can("citizen", "complaint.create")).toBe(true);
  });
  it("chief minister is read-only oversight", () => {
    expect(can("chief_minister", "oversight.read")).toBe(true);
    expect(can("chief_minister", "complaint.transition")).toBe(false);
    expect(can("chief_minister", "complaint.assign")).toBe(false);
  });
  it("mayor can manage complaints", () => {
    expect(can("mayor", "complaint.assign")).toBe(true);
    expect(can("mayor", "complaint.internal_notes")).toBe(true);
  });
  it("a citizen is never allowed into mayor or minister areas", () => {
    expect(AREA_ROLES.mayor).not.toContain("citizen");
    expect(AREA_ROLES.chief_minister).not.toContain("citizen");
    expect(HOME_FOR_ROLE.citizen).toBe("/citizen");
  });
});

describe("complaint validation", () => {
  it("rejects an empty draft with a useful message per field", () => {
    const e = validateDraft(emptyDraft);
    expect(Object.keys(e)).toEqual(expect.arrayContaining(["title", "description", "category", "severity", "address", "location"]));
  });
  it("accepts a complete draft and keeps exact coordinates", () => {
    const e = validateDraft({ ...emptyDraft, title: "Pothole", description: "Large pothole on main road", category: "Roads", severity: "High", address: "Latifabad", lat: 25.3961, lng: 68.3579 });
    expect(e).toEqual({});
  });
});

describe("helpers", () => {
  it("escapes HTML for map popups", () => { expect(esc('<img src=x onerror="a()">')).not.toContain("<"); });
  it("neutralises CSV formula injection", () => { expect(toCsv([{ a: "=HYPERLINK(1)" }])).toContain("\"'=HYPERLINK(1)\""); });
  it("computes response/resolution averages from timestamps", () => {
    const base = { title: "t", description: "d", category: "Roads", severity: "High", location: "", position: [25.4, 68.3] } as const;
    const list = [{ ...base, id: "1", complaintNo: "1", status: "Resolved", reportedAt: "2026-01-01T00:00:00Z", reviewedAt: "2026-01-01T02:00:00Z", resolvedAt: "2026-01-02T00:00:00Z" }] as unknown as Complaint[];
    const s = computeStats(list);
    expect(s.avg_response_hours).toBe(2);
    expect(s.avg_resolution_hours).toBe(24);
    expect(s.urgent).toBe(0);
  });
});
