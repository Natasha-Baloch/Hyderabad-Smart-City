import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CityMap, MapLegend } from "./CityMap";
import { Panel, EmptyState } from "./AppShell";
import { StatusBadge } from "./StatusBadge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { AssetCategory, CityAsset, Incident } from "@/lib/types";

const FILTERS: { key: "all" | AssetCategory; label: string }[] = [
  { key: "all", label: "All" }, { key: "roads", label: "Roads" }, { key: "education", label: "Schools" },
  { key: "healthcare", label: "Healthcare" }, { key: "water", label: "Water" }, { key: "other", label: "Other" },
];

/** Reusable map + filters + layer toggles + search + detail panel (extends the existing CityMap). */
export function MapWorkbench({ assets, incidents, loading, error, colorBy = "severity", onSelectIncident, height = "h-[460px]" }: {
  assets: CityAsset[]; incidents: Incident[]; loading?: boolean; error?: string | null; colorBy?: "severity" | "status";
  onSelectIncident?: (i: Incident) => void; height?: string;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | AssetCategory>("all");
  const [showAssets, setShowAssets] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [asset, setAsset] = useState<CityAsset | null>(null);
  const [inc, setInc] = useState<Incident | null>(null);
  const [focus, setFocus] = useState<[number, number] | null>(null);

  const needle = q.trim().toLowerCase();
  const fa = useMemo(() => assets.filter((a) => (cat === "all" || a.category === cat) && (!needle || `${a.name} ${a.type}`.toLowerCase().includes(needle))), [assets, cat, needle]);
  const fi = useMemo(() => incidents.filter((i) => !needle || `${i.id} ${i.title}`.toLowerCase().includes(needle)), [incidents, needle]);

  function search() {
    const hit = fi.find((i) => i.id.toLowerCase() === needle) ?? fa.find((a) => a.name.toLowerCase().includes(needle));
    if (hit) setFocus(hit.position);
  }

  if (error) return <div role="alert" className="rounded-lg border border-destructive p-4 text-sm text-destructive">Map data failed to load: {error}</div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search by asset name or incident ID" placeholder="Search asset name or incident ID…" className="bg-card pl-9" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
        </div>
        <div className="flex items-center gap-2"><Switch id="la" checked={showAssets} onCheckedChange={setShowAssets} /><Label htmlFor="la">Assets</Label></div>
        <div className="flex items-center gap-2"><Switch id="li" checked={showIncidents} onCheckedChange={setShowIncidents} /><Label htmlFor="li">Incidents</Label></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => <Button key={f.key} size="sm" variant={cat === f.key ? "default" : "outline"} onClick={() => setCat(f.key)}>{f.label}</Button>)}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <div className={`relative ${height} overflow-hidden rounded-xl border`}>
          {loading ? <div className="grid h-full place-items-center bg-muted text-sm text-muted-foreground">Loading records…</div> : (
            <>
              <CityMap assets={showAssets ? fa : []} incidents={showIncidents ? fi : []} focus={focus} colorBy={colorBy}
                onSelectAsset={(a) => { setAsset(a); setInc(null); }} onSelectIncident={(i) => { setInc(i); setAsset(null); onSelectIncident?.(i); }} zoom={12} />
              {!fa.length && !fi.length && <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded bg-card/90 px-3 py-1 text-xs shadow">No records to display</div>}
            </>
          )}
        </div>
        <Panel title="Details">
          {asset ? (
            <div className="space-y-2 text-sm"><p className="font-semibold">{asset.name}</p><p className="text-muted-foreground">{asset.type}</p><StatusBadge value={asset.status} />
              <p className="text-xs italic text-muted-foreground">{asset.verification}</p><p className="text-xs">Lat/Lng: {asset.position[0].toFixed(5)}, {asset.position[1].toFixed(5)}</p></div>
          ) : inc ? (
            <div className="space-y-2 text-sm"><p className="font-semibold">{inc.id}</p><p>{inc.title}</p><div className="flex gap-2"><StatusBadge value={inc.severity} /><StatusBadge value={inc.status} /></div>
              {inc.isDemo && <p className="text-xs italic text-muted-foreground">Sample incident</p>}</div>
          ) : <EmptyState text="Click a marker for details." />}
        </Panel>
      </div>
      <MapLegend />
    </div>
  );
}
