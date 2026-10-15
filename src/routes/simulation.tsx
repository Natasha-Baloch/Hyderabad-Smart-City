import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Info, ArrowDown } from "lucide-react";
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell, Panel } from "@/components/app/AppShell";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { runTrafficScenario } from "@/lib/simulation";
import { trafficBaseline, trafficScenario } from "@/data/mock";

export const Route = createFileRoute("/simulation")({
  head: () => ({
    meta: [
      { title: "Simulation Laboratory — Hyderabad Digital Twin" },
      { name: "description", content: "Explore illustrative what-if scenarios for Hyderabad, Sindh." },
      { property: "og:title", content: "Simulation Laboratory — Hyderabad" },
      { property: "og:description", content: "What-if scenarios with illustrative estimates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Simulation,
});

function Simulation() {
  const [pct, setPct] = useState(30);
  const results = useMemo(() => runTrafficScenario(trafficBaseline, pct), [pct]);
  // Normalise to % of baseline so different units share one chart.
  const chart = results.map((r) => ({ name: r.metric, Baseline: 100, Scenario: Math.round((r.estimate / r.baseline) * 100) }));

  return (
    <AppShell title="Simulation Laboratory" subtitle="Explore what-if scenarios and estimate potential impacts.">
      <div className="mb-4 flex gap-3 rounded-xl border border-info/30 bg-info-soft p-4 text-sm text-info">
        <Info className="h-5 w-5 shrink-0" />
        <p><b>Illustrative estimates only — not real predictions.</b> Results use a simplified hypothetical model and sample baseline values.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={trafficScenario.name} className="lg:col-span-2">
          <p className="-mt-2 mb-5 text-sm text-muted-foreground">{trafficScenario.description}</p>
          <div className="flex items-center justify-between"><Label htmlFor="pct">{trafficScenario.parameterLabel}</Label><span className="text-sm font-semibold text-primary">{pct}%</span></div>
          <Slider id="pct" className="mt-3" min={0} max={100} step={5} value={[pct]} onValueChange={([v]) => setPct(v ?? 0)} aria-label="Reduction percentage" />

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {results.map((r) => (
              <div key={r.metric} className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">{r.metric} (estimate)</p>
                <p className="mt-1 text-xl font-bold">{r.estimate.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{r.unit}</span></p>
                <p className="mt-1 flex items-center text-xs text-success"><ArrowDown className="h-3 w-3" />{Math.round((1 - r.estimate / r.baseline) * 100)}% vs baseline {r.baseline.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <h3 className="mt-6 mb-2 text-sm font-semibold">Baseline vs scenario (% of baseline)</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={chart}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} domain={[0, 100]} />
                <Tooltip /><Legend />
                <Bar dataKey="Baseline" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Scenario" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Assumptions & limitations">
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Baseline figures are hypothetical sample values, not measured data.</li>
            <li>Uses fixed elasticities: travel time 0.6, emissions 0.8, volume 1.0.</li>
            <li>Ignores weather, accidents, events and road network effects.</li>
            <li>Intended for demonstration and discussion only.</li>
          </ul>
          <div className="mt-5 rounded-lg bg-muted p-3 text-xs">
            <p className="font-semibold">Formula (simplified)</p>
            <p className="mt-1 font-mono">Estimate = Baseline × (1 − Reduction% × elasticity)</p>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
