import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

export type MapCandidate = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  avg_eta_min?: number;
  meters_from_centroid?: number;
  category?: "coffee" | "bar" | "food" | "park" | "other";
};

export type MapData = {
  centroid: { lat: number; lng: number };
  candidates: MapCandidate[];
};

type Props = {
  token?: string;
  data?: MapData | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  height?: number; // px
};

if (typeof window !== "undefined" && import.meta.env.VITE_MAPBOX_TOKEN) {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
}

const colorVar: Record<NonNullable<MapCandidate["category"]>, string> = {
  coffee: "var(--vibe-coffee, #4DD0E1)",
  bar: "var(--vibe-bar, #F472B6)",
  food: "var(--vibe-food, #A78BFA)",
  park: "var(--vibe-park, #F59E0B)",
  other: "var(--vibe-other, #A1A1AA)",
};

export default function SmartMap({ token, data, selectedId, onSelect, height = 280 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});

  // init
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (token) mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: data?.centroid ? [data.centroid.lng, data.centroid.lat] : [-118.4695, 33.9925],
      zoom: 13.2,
      interactive: true,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // render markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // clear
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    if (!data) return;

    const bounds = new mapboxgl.LngLatBounds(
      [data.centroid.lng, data.centroid.lat],
      [data.centroid.lng, data.centroid.lat],
    );

    // centroid
    const centerEl = document.createElement("div");
    centerEl.style.cssText =
      "width:10px;height:10px;border-radius:9999px;background:#fff;box-shadow:0 0 0 6px rgba(255,255,255,.15)";
    const centerMarker = new mapboxgl.Marker({ element: centerEl }).setLngLat([data.centroid.lng, data.centroid.lat]).addTo(map);

    // candidates
    data.candidates.forEach((c) => {
      bounds.extend([c.lng, c.lat]);
      const el = document.createElement("button");
      el.type = "button";
      el.style.width = "18px";
      el.style.height = "18px";
      el.style.borderRadius = "9999px";
      el.style.background = colorVar[c.category ?? "other"];
      el.style.border = "2px solid rgba(255,255,255,0.7)";
      el.style.boxShadow =
        c.id === selectedId
          ? "0 0 0 6px rgba(255,255,255,0.18), 0 0 0 10px rgba(99,102,241,0.25)"
          : "0 0 0 6px rgba(255,255,255,0.12)";
      el.addEventListener("click", () => onSelect?.(c.id));

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([c.lng, c.lat])
        .addTo(map);
      markersRef.current[c.id] = marker;

      if (c.id === selectedId) {
        map.easeTo({ center: [c.lng, c.lat], zoom: Math.max(map.getZoom(), 15), duration: 350 });
        new mapboxgl.Popup({ closeButton: false, closeOnMove: true })
          .setLngLat([c.lng, c.lat])
          .setHTML(
            `<div style="font:12px/1.2 system-ui;color:#fff">
              <b>${c.name}</b><br/>~${Math.round(c.avg_eta_min ?? 0)} min • ${Math.round(c.meters_from_centroid ?? 0)}m
            </div>`,
          )
          .addTo(map);
      }
    });

    if (data.candidates.length > 0) map.fitBounds(bounds, { padding: 48, duration: 420 });

    return () => {
      centerMarker.remove();
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};
    };
  }, [JSON.stringify(data), selectedId]);

  return (
    <div className="rounded-xl overflow-hidden border border-white/10" style={{ height }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}