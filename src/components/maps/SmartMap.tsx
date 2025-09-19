import React, { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";

export type HalfCandidate = {
  id: string; name: string; lat: number; lng: number;
  meters_from_centroid?: number; avg_eta_min?: number;
  category?: string;
};
export type HalfResult = {
  centroid: { lat: number; lng: number };
  members: Array<{ profile_id: string; lat: number; lng: number }>;
  candidates: HalfCandidate[];
  rationale?: string;
};

type Props = {
  token?: string;             // defaults to VITE_MAPBOX_TOKEN
  data: HalfResult;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  height?: number;            // px
};

if (typeof window !== "undefined" && import.meta.env?.VITE_MAPBOX_TOKEN) {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
}

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  coffee: "#22d3ee",     // cyan
  bar: "#fb7185",        // rose  
  restaurant: "#f59e0b", // amber
  food: "#f59e0b"        // alias for restaurant
};

export default function SmartMap({ token, data, selectedId, onSelect, height = 280 }: Props) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const bounds = useMemo(() => {
    const b = new mapboxgl.LngLatBounds();
    b.extend([data.centroid.lng, data.centroid.lat]);
    data.members.forEach(m => b.extend([m.lng, m.lat]));
    data.candidates.forEach(c => b.extend([c.lng, c.lat]));
    return b;
  }, [data]);

  useEffect(() => {
    if (!containerRef.current) return;
    const accessToken = token || mapboxgl.accessToken;
    if (!accessToken) {
      console.warn("Mapbox token missing. Set VITE_MAPBOX_TOKEN or pass token prop.");
      return;
    }
    if (token) mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      bounds,
      fitBoundsOptions: { padding: 36 },
      dragRotate: false,
      pitchWithRotate: false,
      interactive: true,
    });
    mapRef.current = map;

    map.on("load", () => {
      // members
      map.addSource("members", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: data.members.map(m => ({
            type: "Feature",
            properties: { profile_id: m.profile_id },
            geometry: { type: "Point", coordinates: [m.lng, m.lat] }
          }))
        }
      });
      map.addLayer({
        id: "members-circles",
        type: "circle",
        source: "members",
        paint: {
          "circle-radius": 5,
          "circle-color": "#ffffff",
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.35)"
        }
      });

      // candidates
      map.addSource("candidates", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: data.candidates.map(c => ({
            type: "Feature",
            properties: { 
              id: c.id, 
              name: c.name,
              category: c.category || "restaurant" 
            },
            geometry: { type: "Point", coordinates: [c.lng, c.lat] }
          }))
        }
      });
      
      // Base candidate markers with category colors
      map.addLayer({
        id: "candidates-circles",
        type: "circle",
        source: "candidates",
        paint: {
          "circle-radius": 6,
          "circle-color": [
            "case",
            ["==", ["get", "category"], "coffee"], CATEGORY_COLORS.coffee,
            ["==", ["get", "category"], "bar"], CATEGORY_COLORS.bar,
            ["==", ["get", "category"], "food"], CATEGORY_COLORS.food,
            CATEGORY_COLORS.restaurant
          ] as any,
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.35)"
        }
      });

      // Selection ring layer
      map.addLayer({
        id: "candidates-selected",
        type: "circle", 
        source: "candidates",
        filter: ["==", ["get", "id"], selectedId ?? ""],
        paint: {
          "circle-radius": 10,
          "circle-color": "transparent",
          "circle-stroke-color": "#9d7bff", // violet neon ring
          "circle-stroke-width": 3,
          "circle-opacity": 0.9
        }
      });

      // centroid
      map.addSource("centroid", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [data.centroid.lng, data.centroid.lat] }
          }]
        }
      });
      map.addLayer({
        id: "centroid-circle",
        type: "circle",
        source: "centroid",
        paint: {
          "circle-radius": 6,
          "circle-color": "#22c55e",
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.35)"
        }
      });

      // member → selected candidate lines
      map.addSource("member-lines", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "member-lines",
        type: "line",
        source: "member-lines",
        paint: { "line-color": "#60a5fa", "line-width": 2, "line-opacity": 0.9 }
      });

      // Interaction handlers
      map.on("click", "candidates-circles", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id && onSelect) onSelect(id);
      });

      // Hover effects
      map.on("mouseenter", "candidates-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "candidates-circles", () => {
        map.getCanvas().style.cursor = "";
      });

      // Enhanced tooltip
      const popup = new mapboxgl.Popup({ 
        closeButton: false, 
        closeOnClick: false,
        className: "mapbox-tooltip"
      });
      
      map.on("mousemove", "candidates-circles", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const name = f.properties?.name as string;
        const category = f.properties?.category as string;
        popup
          .setLngLat(e.lngLat)
          .setHTML(`<div class="text-xs font-medium">${name}</div><div class="text-xs text-white/60 capitalize">${category}</div>`)
          .addTo(map);
      });
      
      map.on("mouseleave", "candidates-circles", () => {
        popup.remove();
      });

      updateLines(map, data, selectedId);
    });

    // soft-fail layer/style races
    map.on("error", (evt) => {
      const msg: string | undefined = (evt as any)?.error?.message || (evt as any)?.message;
      if (msg && msg.includes("does not exist in the map")) return;
      console.warn("[Mapbox] error:", evt);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []); // mount once

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    updateLines(map, data, selectedId);
    try {
      // Update selection ring filter
      map.setFilter("candidates-selected", ["==", ["get", "id"], selectedId ?? ""]);
    } catch {}
  }, [data, selectedId]);

  return <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-white/10 neon-surface" style={{ height }} />;
}

function emptyFC(): GeoJSON.FeatureCollection { return { type: "FeatureCollection", features: [] }; }

function updateLines(map: mapboxgl.Map, data: HalfResult, selectedId?: string | null) {
  const candidate = data.candidates.find(c => c.id === selectedId) ?? data.candidates[0];
  if (!candidate) {
    (map.getSource("member-lines") as any)?.setData(emptyFC());
    return;
  }
  const features = data.members.map(m => ({
    type: "Feature",
    properties: { to: candidate.id, profile_id: m.profile_id },
    geometry: { type: "LineString", coordinates: [[m.lng,m.lat],[candidate.lng,candidate.lat]] }
  }));
  (map.getSource("member-lines") as any)?.setData({ type: "FeatureCollection", features });
}