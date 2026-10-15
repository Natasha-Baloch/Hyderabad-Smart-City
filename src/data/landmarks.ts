import gateway from "@/assets/landmarks/landmark-1-arched-gateway.jpg";
import clock from "@/assets/landmarks/landmark-2-nakhlai-market-clock-tower.jpg";
import shrine from "@/assets/landmarks/landmark-3-tiled-shrine.jpg";
import fallback from "@/assets/hero-hyderabad.jpg";

/**
 * Landmark gallery. To replace an image, drop a new file in src/assets/landmarks and change `image`.
 * Captions describe ONLY what is visible in the supplied photographs. Names marked `confirmed: false`
 * are placeholders — edit them once you have verified the landmark's name and history.
 */
export interface Landmark { id: string; name: string; description: string; image: string; fallback: string; confirmed: boolean }

export const landmarks: Landmark[] = [
  { id: "gateway", name: "Arched gateway (name to be confirmed)", description: "A sandstone-coloured ceremonial arch with minarets and small domes, photographed from a city road.", image: gateway, fallback, confirmed: false },
  { id: "nakhlai-clock-tower", name: "Nakhlai Market Clock Tower", description: "A brick clock-tower gateway marking the entrance to a busy fruit market, as labelled on the tower.", image: clock, fallback, confirmed: true },
  { id: "tiled-shrine", name: "Tiled shrine (name to be confirmed)", description: "White domes and minarets decorated with blue and orange geometric tilework.", image: shrine, fallback, confirmed: false },
];
