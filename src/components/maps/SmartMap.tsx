import React, { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { HalfResult } from "@/hooks/useHQMeetHalfway";

type Props = {
  data: HalfResult;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  height?: number;
  token?: string;
};

if (typeof window !== "undefined" && import.meta.env?.VITE_MAPBOX_TOKEN) {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
}

export default function SmartMap({ data, selectedId, onSelect, height = 280, token }: Props) {
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
    if (token) mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      bounds,
      fitBoundsOptions: { padding: 36 },
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;

    map.on("load", () => {
      // Members (white dots)
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

      // Candidates (category colored)
      map.addSource("candidates", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: data.candidates.map(c => ({
            type: "Feature",
            properties: { id: c.id, name: c.name, category: c.category ?? "" },
            geometry: { type: "Point", coordinates: [c.lng, c.lat] }
          }))
        }
      });

      // base dots
      map.addLayer({
        id: "candidates-circles",
        type: "circle",
        source: "candidates",
        paint: {
          // category color
          "circle-color": [
            "match", ["get", "category"],
            "coffee", "var(--c-coffee)",
            "bar", "var(--c-bar)",
            "restaurant", "var(--c-restaurant)",
            /* default */ "#7c3aed"
          ] as any,
          "circle-radius": 6,
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.35)"
        }
      });

      // selected ring (bigger, glowy)
      map.addLayer({
        id: "candidates-selected",
        type: "circle",
        source: "candidates",
        filter: ["==", ["get", "id"], selectedId ?? ""],
        paint: {
          "circle-color": "transparent",
          "circle-radius": 10,
          "circle-stroke-width": 3,
          "circle-stroke-color": "var(--c-selected)"
        }
      });

      // centroid (green)
      map.addSource("centroid", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            geometry: { type: "Point", coordinates: [data.centroid.lng, data.centroid.lat] },
            properties: {}
          }]
        }
      });
      map.addLayer({
        id: "centroid",
        type: "circle",
        source: "centroid",
        paint: {
          "circle-radius": 6,
          "circle-color": "#22c55e",
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.35)"
        }
      });

      // lines from members -> selected
      map.addSource("member-lines", {
        type: "geojson",
        data: emptyFC()
      });
      map.addLayer({
        id: "member-lines",
        type: "line",
        source: "member-lines",
        paint: {
          "line-color": "#60a5fa",
          "line-width": 2,
          "line-opacity": 0.9
        }
      });

      // tooltip-like hover (cursor)
      map.on("mouseenter", "candidates-circles", () => map.getCanvas().style.cursor = "pointer");
      map.on("mouseleave", "candidates-circles", () => map.getCanvas().style.cursor = "");

      map.on("click", "candidates-circles", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id && onSelect) onSelect(id);
      });

      // initial lines
      updateLines(map, data, selectedId);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // mount

  // when selectedId changes, update ring + lines
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      map.setFilter("candidates-selected", ["==", ["get", "id"], selectedId ?? ""]);
      updateLines(map, data, selectedId ?? null);
    } catch {}
  }, [data, selectedId]);

  return <div ref={containerRef} style={{ height }} className="rounded-xl overflow-hidden neon-surface" />;
}

function emptyFC(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function updateLines(map: mapboxgl.Map, data: HalfResult, selectedId: string | null) {
  const cand = data.candidates.find(c => c.id === selectedId) ?? data.candidates[0];
  if (!cand) {
    (map.getSource("member-lines") as any)?.setData(emptyFC());
    return;
  }
  const features = data.members.map(m => ({
    type: "Feature",
    properties: { profile_id: m.profile_id, to: cand.id },
    geometry: { type: "LineString", coordinates: [[m.lng, m.lat], [cand.lng, cand.lat]] }
  }));
  (map.getSource("member-lines") as any)?.setData({ type: "FeatureCollection", features });
}