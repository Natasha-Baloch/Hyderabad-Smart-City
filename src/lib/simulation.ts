import type { ScenarioResult } from "./types";

/** Illustrative model: estimate = baseline × (1 − reduction% × elasticity). Not a prediction. */
export function runTrafficScenario(
  base: { travelTime: number; emissions: number; volume: number },
  reductionPct: number,
): ScenarioResult[] {
  const r = Math.min(100, Math.max(0, reductionPct)) / 100;
  const f = (v: number, e: number) => Math.round(v * (1 - r * e));
  return [
    { metric: "Avg. travel time", unit: "min", baseline: base.travelTime, estimate: f(base.travelTime, 0.6) },
    { metric: "Emissions", unit: "tons", baseline: base.emissions, estimate: f(base.emissions, 0.8) },
    { metric: "Traffic volume", unit: "vehicles", baseline: base.volume, estimate: f(base.volume, 1) },
  ];
}
