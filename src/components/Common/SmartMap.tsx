import React, { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";

export type HalfCandidate = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  meters_from_centroid?: number;
  avg_eta_min?: number;
  per_member?: Array<{ profile_id: string; meters: number; eta_min: number }>;
  score?: number;
};

export type HalfResult = {
  centroid: { lat: number; lng: number };
  members: Array<{ profile_id: string; lat: number; lng: number }>;
  candidates: HalfCandidate[];
  rationale?: string;
};

type Props = {
  token?: string; // defaults to import.meta.env.VITE_MAPBOX_TOKEN
  data: HalfResult;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  height?: number; // px
};

// Set the default token if available
if (typeof window !== 'undefined' && import.meta.env.VITE_MAPBOX_TOKEN) {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
}

export default function SmartMap({
  token,
  data,
  selectedId,
  onSelect,
  height = 280,
}: Props) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // All points to fit
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

    if (token) {
      mapboxgl.accessToken = token;
    }

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
      // Members
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

      // Candidates
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
          "circle-radius": [
            "case", ["==", ["get", "id"], selectedId ?? ""], 7, 5
          ] as any,
          "circle-color": [
            "case", ["==", ["get", "id"], selectedId ?? ""], "#22d3ee", "#7c3aed"
          ] as any,
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.35)"
        }
      });

      // Centroid
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

      // Lines from members → selected candidate
      const lineId = "member-lines";
      map.addSource(lineId, {
        type: "geojson",
        data: emptyLineFC()
      });
      map.addLayer({
        id: lineId,
        type: "line",
        source: lineId,
        paint: {
          "line-color": "#60a5fa",
          "line-width": 2,
          "line-opacity": 0.9
        }
      });

      // Click on candidates to select
      map.on("click", "candidates-circles", (e) => {
        const f = e.features?.[0];
        const id = f?.properties?.id as string | undefined;
        if (id && onSelect) onSelect(id);
      });

      // initial lines
      updateLines(map, data, selectedId);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // mount once

  // Update lines & selected styling when selectedId changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    updateLines(map, data, selectedId);
    // update candidate paint for selection
    try {
      map.setPaintProperty("candidates-circles", "circle-radius",
        ["case", ["==", ["get","id"], selectedId ?? ""], 7, 5] as any
      );
      map.setPaintProperty("candidates-circles", "circle-color",
        ["case", ["==", ["get","id"], selectedId ?? ""], "#22d3ee", "#7c3aed"] as any
      );
    } catch (e) {
      console.warn("Failed to update map paint properties:", e);
    }
  }, [data, selectedId]);

  return <div ref={containerRef} style={{ height }} className="rounded-xl overflow-hidden border border-white/10" />;
}

function emptyLineFC() {
  return { type: "FeatureCollection", features: [] } as any;
}

function updateLines(map: mapboxgl.Map, data: HalfResult, selectedId?: string | null) {
  try {
    const candidate = data.candidates.find(c => c.id === selectedId) ?? data.candidates[0];
    if (!candidate) {
      (map.getSource("member-lines") as any)?.setData(emptyLineFC());
      return;
    }
    const features = data.members.map(m => ({
      type: "Feature",
      properties: { profile_id: m.profile_id, to: candidate.id },
      geometry: {
        type: "LineString",
        coordinates: [
          [m.lng, m.lat],
          [candidate.lng, candidate.lat]
        ]
      }
    }));
    (map.getSource("member-lines") as any)?.setData({
      type: "FeatureCollection",
      features
    });
  } catch (e) {
    console.warn("Failed to update map lines:", e);
  }
}