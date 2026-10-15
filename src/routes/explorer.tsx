import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell, Panel, EmptyState } from "@/components/app/AppShell";
import { CityMap } from "@/components/app/CityMap";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getAssets, useIncidents } from "@/lib/data";
import type { AssetCategory, CityAsset } from "@/lib/types";

export const Route = createFileRoute("/explorer")({
  head: () => ({
    meta: [
      { title: "Digital Twin Explorer — Hyderabad, Sindh" },
      { name: "description", content: "Interactive map of Hyderabad, Sindh city assets and reported incidents." },
      { property: "og:title", content: "Digital Twin Explorer — Hyderabad" },
      { property: "og:description", content: "Search, filter and inspect city assets on the map." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Explorer,
});

const filters: { key: "all" | AssetCategory; label: string }[] = [
  { key: "all", label: "All" }, { key: "roads", label: "Roads" }, { key: "education", label: "Education" },
  { key: "healthcare", label: "Healthcare" }, { key: "water", label: "Water" }, { key: "other", label: "Other" },
];

function Explorer() {
  const incidents = useIncidents();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | AssetCategory>("all");
  const [showAssets, setShowAssets] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [selected, setSelected] = useState<CityAsset | null>(null);

  const assets = useMemo(
    () => getAssets().filter((a) => (cat === "all" || a.category === cat) && `${a.name} ${a.id} ${a.type}`.toLowerCase().includes(q.toLowerCase())),
    [q, cat],
  );

  return (
    <AppShell title="Digital Twin Explorer" subtitle="Explore city assets, infrastructure and incidents (sample records).">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Search assets" placeholder="Search asset name or ID…" className="pl-9 bg-card" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button key={f.key} size="sm" variant={cat === f.key ? "default" : "outline"} onClick={() => setCat(f.key)}>{f.label}</Button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="h-[420px] overflow-hidden rounded-xl border sm:h-[600px]">
          <CityMap
            assets={showAssets ? assets : []}
            incidents={showIncidents ? incidents : []}
            focus={selected?.position ?? null}
            onSelectAsset={setSelected}
          />
        </div>
        <div className="space-y-4">
          <Panel title="Selected asset">
            {selected ? (
              <dl className="space-y-2 text-sm">
                <p className="font-semibold">{selected.name}</p>
                {[["ID", selected.id], ["Type", selected.type], ["Location", selected.position.map((n) => n.toFixed(4)).join(", ")], ["Facilities", selected.facilities ?? "N/A"]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd></div>
                ))}
                <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge value={selected.status} /></dd></div>
                <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setSelected(null)}>Close</Button>
              </dl>
            ) : <EmptyState text="Click a marker or list item to see details." />}
          </Panel>
          <Panel title="Map layers">
            <div className="space-y-3">
              <div className="flex items-center justify-between"><Label htmlFor="la">City assets</Label><Switch id="la" checked={showAssets} onCheckedChange={setShowAssets} /></div>
              <div className="flex items-center justify-between"><Label htmlFor="li">Incidents</Label><Switch id="li" checked={showIncidents} onCheckedChange={setShowIncidents} /></div>
            </div>
          </Panel>
          <Panel title={`Results (${assets.length})`}>
            {assets.length === 0 ? <EmptyState text="No assets match your search." /> : (
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {assets.map((a) => (
                  <li key={a.id}>
                    <button onClick={() => setSelected(a)} className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
                      {a.name} <span className="text-xs text-muted-foreground">· {a.type}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
