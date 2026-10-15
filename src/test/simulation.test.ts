import { describe, expect, it } from "vitest";
import { runTrafficScenario } from "@/lib/simulation";

const base = { travelTime: 28, emissions: 1200, volume: 85000 };

describe("traffic scenario", () => {
  it("0% reduction returns baseline", () => {
    expect(runTrafficScenario(base, 0).map((r) => r.estimate)).toEqual([28, 1200, 85000]);
  });
  it("30% reduction applies elasticities", () => {
    expect(runTrafficScenario(base, 30).map((r) => r.estimate)).toEqual([23, 912, 59500]);
  });
});
