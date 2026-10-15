import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CityAsset, Incident } from "@/lib/types";
import { HYDERABAD_CENTER } from "@/data/mock";

const colors: Record<string, string> = {
  roads: "#64748b", education: "#0ea5e9", healthcare: "#10b981", water: "#3b82f6", other: "#8b5cf6",
  Critical: "#b91c1c", High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e",
  Submitted: "#3b82f6", "Under Review": "#8b5cf6", Assigned: "#06b6d4", "In Progress": "#f59e0b", Resolved: "#22c55e", Reopened: "#ef4444", Reported: "#3b82f6",
  Pending: "#f59e0b", Accepted: "#06b6d4", Completed: "#22c55e", Rejected: "#ef4444",
};

/** User-supplied text must never reach innerHTML unescaped. */
export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const dot = (color: string, square = false, ring = false) =>
  L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;background:${color};border:2px solid ${ring ? "#0f172a" : "#fff"};border-radius:${square ? "3px" : "50%"};box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
    iconSize: [16, 16],
  });

export interface CityMapProps {
  assets: CityAsset[];
  incidents: Incident[];
  focus?: [number, number] | null;
  onSelectAsset?: (a: CityAsset) => void;
  onSelectIncident?: (i: Incident) => void;
  zoom?: number;
  /** colour incident markers by severity (default) or workflow status */
  colorBy?: "severity" | "status";
  /** location-picker mode: clicking the map calls onPick with exact lat/lng */
  onPick?: (lat: number, lng: number) => void;
  picked?: [number, number] | null;
}

export default function CityMapLeaflet({ assets, incidents, focus, onSelectAsset, onSelectIncident, zoom = 13, colorBy = "severity", onPick, picked }: CityMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pickMarker = useRef<L.Marker | null>(null);
  const assetCb = useRef(onSelectAsset);
  const incCb = useRef(onSelectIncident);
  const pickCb = useRef(onPick);
  assetCb.current = onSelectAsset;
  incCb.current = onSelectIncident;
  pickCb.current = onPick;

  // Create the map exactly once; always clean up listeners and the instance.
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true }).setView(HYDERABAD_CENTER, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => pickCb.current?.(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)));
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    map.current = m;
    return () => { ro.disconnect(); m.off(); m.remove(); map.current = null; layer.current = null; pickMarker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    assets.forEach((a) => {
      L.marker(a.position, { icon: dot(colors[a.category] ?? "#64748b") })
        .bindPopup(`<b>${esc(a.name)}</b><br/>${esc(a.type)}<br/>Status: ${esc(a.status)}<br/><i>${esc(a.verification ?? "Sample record — unverified location")}</i>`)
        .on("click", () => assetCb.current?.(a))
        .addTo(g);
    });
    incidents.forEach((i) => {
      const key = colorBy === "status" ? i.status : i.severity;
      L.marker(i.position, { icon: dot(colors[key] ?? "#ef4444", true) })
        .bindPopup(`<b>${esc(i.id)}: ${esc(i.title)}</b><br/>${esc(i.category)} · ${esc(i.severity)}<br/>Status: ${esc(i.status)}${i.isDemo ? "<br/><i>Sample incident</i>" : ""}`)
        .on("click", () => incCb.current?.(i))
        .addTo(g);
    });
  }, [assets, incidents, colorBy]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    pickMarker.current?.remove();
    pickMarker.current = picked ? L.marker(picked, { icon: dot("#0ea5e9", false, true) }).addTo(m) : null;
  }, [picked]);

  useEffect(() => {
    if (focus && map.current) map.current.setView(focus, 15);
  }, [focus]);

  return (
    <div
      ref={el}
      className={`h-full w-full ${onPick ? "cursor-crosshair" : ""}`}
      role="application"
      aria-label={onPick ? "Map: click to choose the complaint location" : "Map of Hyderabad, Sindh"}
    />
  );
}
