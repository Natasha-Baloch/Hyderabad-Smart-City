import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { CityMapProps } from "./CityMapLeaflet";

const Inner = lazy(() => import("./CityMapLeaflet"));

const Loading = () => (
  <div className="grid h-full w-full place-items-center bg-muted text-sm text-muted-foreground">Loading map…</div>
);

export function CityMap(props: CityMapProps) {
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <Inner {...props} />
      </Suspense>
    </ClientOnly>
  );
}

export function MapLegend() {
  const items = [
    ["bg-info", "City asset (circle)"],
    ["bg-destructive", "Incident (square)"],
  ];
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {items.map(([c, l]) => (
        <span key={l} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${c}`} />{l}</span>
      ))}
    </div>
  );
}
