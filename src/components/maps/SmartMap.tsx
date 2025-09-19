import React, { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";

export type HalfCandidate = {
  id: string; name: string; lat: number; lng: number;
  meters_from_centroid?: number; avg_eta_min?: number;
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
            properties: { id: c.id, name: c.name },
            geometry: { type: "Point", coordinates: [c.lng, c.lat] }
          }))
        }
      });
      map.addLayer({
        id: "candidates-circles",
        type: "circle",
        source: "candidates",
        paint: {
          "circle-radius": ["case", ["==", ["get","id"], selectedId ?? ""], 7, 5] as any,
          "circle-color":  ["case", ["==", ["get","id"], selectedId ?? ""], "#22d3ee", "#7c3aed"] as any,
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.35)"
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

      map.on("click", "candidates-circles", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id && onSelect) onSelect(id);
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
      map.setPaintProperty("candidates-circles", "circle-radius",
        ["case", ["==", ["get","id"], selectedId ?? ""], 7, 5] as any);
      map.setPaintProperty("candidates-circles", "circle-color",
        ["case", ["==", ["get","id"], selectedId ?? ""], "#22d3ee", "#7c3aed"] as any);
    } catch {}
  }, [data, selectedId]);

  return <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-white/10" style={{ height }} />;
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