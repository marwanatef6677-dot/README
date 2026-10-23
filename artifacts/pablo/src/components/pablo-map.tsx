import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

export type LatLng = { lat: number; lng: number };
export type DriverPin = LatLng & { accuracy: number; stale: boolean };

const CAIRO: [number, number] = [30.0444, 31.2357];

const pin = (kind: "pickup" | "destination") =>
  L.divIcon({
    className: "",
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    html: kind === "pickup"
      ? `<div class="pb-pin pb-pin-pick"><span></span></div>`
      : `<div class="pb-pin pb-pin-dest"><span></span></div>`,
  });
const carIcon = (stale: boolean) =>
  L.divIcon({ className: "", iconSize: [36, 36], iconAnchor: [18, 18], html: `<div class="pb-car ${stale ? "pb-car-stale" : ""}"><span>P</span></div>` });

/** Native Leaflet map. Children-free, imperatively synced from props. */
export function PabloMap({
  pickup, destination, route, driver, onPick, picking, className, fitKey,
}: {
  pickup?: LatLng | null; destination?: LatLng | null; route?: number[][] | null; driver?: DriverPin | null;
  onPick?: (p: LatLng) => void; picking?: boolean; className?: string; fitKey?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<L.LayerGroup | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const lastFit = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { center: CAIRO, zoom: 11, zoomControl: true, attributionControl: true });
    m.attributionControl.setPrefix(false);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    }).addTo(m);
    layers.current = L.layerGroup().addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => onPickRef.current?.({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }));
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current, g = layers.current;
    if (!m || !g) return;
    g.clearLayers();
    const pts: L.LatLngExpression[] = [];
    if (route && route.length > 1) {
      const ll = route.map(([lng, lat]) => [lat, lng] as [number, number]);
      L.polyline(ll, { color: "#10151d", weight: 8, opacity: 0.9 }).addTo(g);
      L.polyline(ll, { color: "#ffd000", weight: 3.5, dashArray: "8 8" }).addTo(g);
      pts.push(...ll);
    }
    if (pickup) { L.marker([pickup.lat, pickup.lng], { icon: pin("pickup"), keyboard: false }).addTo(g); pts.push([pickup.lat, pickup.lng]); }
    if (destination) { L.marker([destination.lat, destination.lng], { icon: pin("destination"), keyboard: false }).addTo(g); pts.push([destination.lat, destination.lng]); }
    if (driver) {
      L.circle([driver.lat, driver.lng], { radius: driver.accuracy, color: "#10151d", weight: 1, fillColor: "#ffd000", fillOpacity: 0.15 }).addTo(g);
      L.marker([driver.lat, driver.lng], { icon: carIcon(driver.stale), keyboard: false }).addTo(g);
      pts.push([driver.lat, driver.lng]);
    }
    const key = fitKey ?? JSON.stringify([pickup, destination, route?.length ?? 0]);
    if (pts.length && key !== lastFit.current) {
      lastFit.current = key;
      if (pts.length === 1) m.setView(pts[0], Math.max(m.getZoom(), 15));
      else m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
    }
  }, [pickup, destination, route, driver, fitKey]);

  return (
    <div className={cn("relative isolate z-0 overflow-hidden rounded-[1.75rem] border border-[#10151d]/15", picking && "pb-picking", className)}>
      <div ref={el} dir="ltr" className="h-full min-h-[300px] w-full" data-testid="map" />
    </div>
  );
}
