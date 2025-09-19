import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

export type MapMember = { id: string; lat: number; lng: number; label?: string };
export type MemberETA = { id: string; lat: number; lng: number; eta_min: number };

export type MapCandidate = {
  id: string; name: string; lat: number; lng: number;
  meters_from_centroid?: number; avg_eta_min?: number; score?: number;
  category?: "coffee"|"bar"|"food"|"park"|"other";
};

export type MapData = { centroid:{lat:number; lng:number}; candidates: MapCandidate[] };

type Props = {
  token?: string;
  data?: MapData | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  height?: number;                // px
  members?: MapMember[];          // draw member points
  memberEtas?: MemberETA[];       // draw ETA text at member points
  route?: { type:"LineString"; coordinates:[number,number][] } | null;
};

if (typeof window !== "undefined" && import.meta.env.VITE_MAPBOX_TOKEN) {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
}

const colorVar: Record<NonNullable<MapCandidate["category"]>, string> = {
  coffee: "var(--vibe-coffee,#4DD0E1)",
  bar:    "var(--vibe-bar,#F472B6)",
  food:   "var(--vibe-food,#A78BFA)",
  park:   "var(--vibe-park,#F59E0B)",
  other:  "var(--vibe-other,#A1A1AA)",
};

export default function SmartMap({
  token, data, selectedId, onSelect, height = 280, members = [], memberEtas = [], route
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const venueMarkers = useRef<Record<string, mapboxgl.Marker>>({});
  const memberMarkers = useRef<Record<string, mapboxgl.Marker>>({});

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

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // venues + centroid
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // clear venue markers
    Object.values(venueMarkers.current).forEach((m) => m.remove());
    venueMarkers.current = {};

    // clear centroid (if any)
    if (map.getSource("centroid")) { if (map.getLayer("centroid")) map.removeLayer("centroid"); map.removeSource("centroid"); }

    if (!data) return;

    // centroid as a tiny circle layer (no DOM node needed)
    map.addSource("centroid", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "Point", coordinates: [data.centroid.lng, data.centroid.lat] }, properties: {} }
    });
    map.addLayer({
      id: "centroid",
      type: "circle",
      source: "centroid",
      paint: { "circle-color": "#ffffff", "circle-radius": 4, "circle-stroke-color": "#ffffff", "circle-stroke-width": 1 }
    });

    const bounds = new mapboxgl.LngLatBounds([data.centroid.lng, data.centroid.lat],[data.centroid.lng, data.centroid.lat]);

    // venues
    data.candidates.forEach((c) => {
      bounds.extend([c.lng, c.lat]);

      const el = document.createElement("button");
      el.type = "button";
      el.style.width = "18px"; el.style.height = "18px";
      el.style.borderRadius = "9999px";
      el.style.background = colorVar[c.category ?? "other"];
      el.style.border = "2px solid rgba(255,255,255,0.7)";
      el.style.boxShadow = c.id === selectedId
        ? "0 0 0 6px rgba(255,255,255,0.18), 0 0 0 10px rgba(129,140,248,0.25)"
        : "0 0 0 6px rgba(255,255,255,0.12)";
      el.addEventListener("click", () => onSelect?.(c.id));

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([c.lng, c.lat]).addTo(map);
      venueMarkers.current[c.id] = marker;

      if (c.id === selectedId) {
        map.easeTo({ center: [c.lng, c.lat], zoom: Math.max(map.getZoom(), 15), duration: 350 });
      }
    });

    if (data.candidates.length > 0) map.fitBounds(bounds, { padding: 48, duration: 420 });

    return () => {
      if (map.getLayer("centroid")) map.removeLayer("centroid");
      if (map.getSource("centroid")) map.removeSource("centroid");
    };
  }, [JSON.stringify(data), selectedId]);

  // members + rays to selected venue + ETA labels
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // clean previous
    Object.values(memberMarkers.current).forEach((m) => m.remove());
    memberMarkers.current = {};
    if (map.getLayer("rays")) map.removeLayer("rays");
    if (map.getSource("rays")) map.removeSource("rays");
    if (map.getLayer("eta-layer")) map.removeLayer("eta-layer");
    if (map.getSource("eta-src")) map.removeSource("eta-src");

    const venue = data?.candidates.find((c) => c.id === selectedId);
    if (!venue || (!members.length && !memberEtas.length)) return;

    // member dots
    members.forEach((m) => {
      const el = document.createElement("div");
      el.style.cssText = "width:12px;height:12px;border-radius:9999px;background:#fff;border:2px solid rgba(255,255,255,.65)";
      const mk = new mapboxgl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map);
      memberMarkers.current[m.id] = mk;
    });

    // rays
    const features = members.map((m) => ({
      type: "Feature" as const,
      geometry: { type: "LineString" as const, coordinates: [[m.lng, m.lat], [venue.lng, venue.lat]] },
      properties: {},
    }));
    map.addSource("rays", { type: "geojson", data: { type: "FeatureCollection", features } });
    map.addLayer({
      id: "rays",
      type: "line",
      source: "rays",
      paint: {
        "line-color": "#22d3ee", // cyan
        "line-opacity": 0.7,
        "line-width": 3,
      },
    });

    // ETA text at member points (uses symbol layer)
    if (memberEtas.length) {
      map.addSource("eta-src", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: memberEtas.map((e) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [e.lng, e.lat] },
            properties: { etaText: `${e.eta_min}m` },
          })),
        },
      });
      map.addLayer({
        id: "eta-layer",
        type: "symbol",
        source: "eta-src",
        layout: {
          "text-field": ["get", "etaText"],
          "text-size": 12,
          "text-offset": [0, -1.2],
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.65)",
          "text-halo-width": 1.2,
        },
      });
    }

    return () => {
      if (map.getLayer("rays")) map.removeLayer("rays");
      if (map.getSource("rays")) map.removeSource("rays");
      if (map.getLayer("eta-layer")) map.removeLayer("eta-layer");
      if (map.getSource("eta-src")) map.removeSource("eta-src");
      Object.values(memberMarkers.current).forEach((m) => m.remove());
      memberMarkers.current = {};
    };
  }, [selectedId, members.length, JSON.stringify(memberEtas)]);

  // add/remove route source+layer when `route` changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = "route-src";
    const layer = "route-layer";

    // cleanup existing
    if (map.getLayer(layer)) map.removeLayer(layer);
    if (map.getSource(src)) map.removeSource(src);

    if (route && route.coordinates?.length) {
      map.addSource(src, {
        type: "geojson",
        data: { type: "Feature", geometry: route, properties: {} },
      });
      map.addLayer({
        id: layer,
        type: "line",
        source: src,
        paint: {
          "line-color": "#8B5CF6",
          "line-width": 5,
          "line-opacity": 0.9,
        },
      });
    }
    return () => {
      if (map.getLayer(layer)) map.removeLayer(layer);
      if (map.getSource(src)) map.removeSource(src);
    };
  }, [route ? JSON.stringify(route.coordinates) : ""]);

  return (
    <div className="rounded-xl overflow-hidden border border-white/10" style={{ height }}>
      <div ref={containerRef} style={{ width:"100%", height:"100%" }} />
    </div>
  );
}