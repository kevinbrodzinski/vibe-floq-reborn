/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OverlaySpec } from '@/lib/map/LayerManager';

const SRC_ID = 'flow:route';
const LYR_PATH = 'flow:route:path';
const LYR_LINE = 'flow:route:line';
const LYR_ANIM = 'flow:route:anim';
const LYR_VENUES = 'flow:route:venues';
const LYR_LABELS = 'flow:route:labels';

export function createFlowRouteSpec(beforeId?: string): OverlaySpec {
  return {
    id: 'flow-route',
    beforeId,
    mount(map) {
      if (!map.getSource(SRC_ID)) {
        map.addSource(SRC_ID, { 
          type: 'geojson', 
          data: { type: 'FeatureCollection', features: [] } as any 
        });
      }

      // Path segments between venues (dashed)
      if (!map.getLayer(LYR_PATH)) {
        const pathLayer: mapboxgl.LineLayer = {
          id: LYR_PATH,
          type: 'line',
          source: SRC_ID,
          filter: ['==', ['get', 'type'], 'path'],
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#ffffff',
            'line-opacity': 0.25,
            'line-width': 2,
            'line-dasharray': [1, 2],
          },
        };
        beforeId && map.getLayer(beforeId) ? map.addLayer(pathLayer, beforeId) : map.addLayer(pathLayer);
      }

      // Main flow line
      if (!map.getLayer(LYR_LINE)) {
        const lineLayer: mapboxgl.LineLayer = {
          id: LYR_LINE,
          type: 'line',
          source: SRC_ID,
          filter: ['==', ['get', 'type'], 'flow'],
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': [
              'case',
              ['has', 'active'], ['case', ['get', 'active'], '#EC4899', '#A855F7'],
              '#A855F7',
            ],
            'line-opacity': 0.6,
            'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3, 16, 5, 20, 8],
          },
        };
        beforeId && map.getLayer(beforeId) ? map.addLayer(lineLayer, beforeId) : map.addLayer(lineLayer);
      }

      // Animated pulse overlay (for retrace mode)
      if (!map.getLayer(LYR_ANIM)) {
        const animLayer: mapboxgl.LineLayer = {
          id: LYR_ANIM,
          type: 'line',
          source: SRC_ID,
          filter: ['==', ['get', 'type'], 'flow'],
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#EC4899',
            'line-opacity': 0, // animated via setPaintProperty
            'line-width': 10,
            'line-blur': 3,
          },
        };
        beforeId && map.getLayer(beforeId) ? map.addLayer(animLayer, beforeId) : map.addLayer(animLayer);
      }

      // Venue dots with vibe colors
      if (!map.getLayer(LYR_VENUES)) {
        const venuesLayer: mapboxgl.CircleLayer = {
          id: LYR_VENUES,
          type: 'circle',
          source: SRC_ID,
          filter: ['==', ['get', 'type'], 'venue'],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 6, 16, 10, 20, 14],
            // Use feature's 'color' if present, otherwise default
            'circle-color': [
              'coalesce', 
              ['get', 'color'], 
              ['case', ['get', 'active'], '#EC4899', '#A855F7']
            ],
            'circle-opacity': ['case', ['get', 'active'], 1, 0.85],
            'circle-stroke-color': '#fff',
            'circle-stroke-width': ['case', ['get', 'active'], 3, 2],
          },
        };
        beforeId && map.getLayer(beforeId) ? map.addLayer(venuesLayer, beforeId) : map.addLayer(venuesLayer);
      }

      // Venue labels (index numbers)
      if (!map.getLayer(LYR_LABELS)) {
        const labelsLayer: mapboxgl.SymbolLayer = {
          id: LYR_LABELS,
          type: 'symbol',
          source: SRC_ID,
          filter: ['==', ['get', 'type'], 'venue'],
          layout: {
            'text-field': ['to-string', ['get', 'index']],
            'text-size': 10,
            'text-anchor': 'center',
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          },
          paint: {
            'text-color': '#fff',
            // Use feature's 'color' if present for consistent label glow
            'text-halo-color': [
              'coalesce', 
              ['get', 'color'], 
              ['case', ['get', 'active'], '#EC4899', '#A855F7']
            ],
            'text-halo-width': 2,
          },
        };
        beforeId && map.getLayer(beforeId) ? map.addLayer(labelsLayer, beforeId) : map.addLayer(labelsLayer);
      }
    },
    update(map, fc) {
      const src = map.getSource(SRC_ID) as mapboxgl.GeoJSONSource;
      src?.setData(fc as any);
    },
    unmount(map) {
      [LYR_LABELS, LYR_ANIM, LYR_VENUES, LYR_PATH, LYR_LINE].forEach(id => {
        try { if (map.getLayer(id)) map.removeLayer(id); } catch {}
      });
      try { if (map.getSource(SRC_ID)) map.removeSource(SRC_ID); } catch {}
    }
  };
}

// Helper function to convert flow route to GeoJSON FeatureCollection
export function flowRouteToFC(flowRoute: Array<{
  id: string;
  position: [number, number];
  venueId?: string;
  venueName?: string;
  vibeKey?: string;
  vibeHex?: string;
}>): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const venues = flowRoute.filter(p => p.venueId);

  // Main flow line
  if (venues.length > 1) {
    const coords = venues.map(v => v.position);
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: { type: 'flow' },
    } as any);
  }

  // Venue points
  venues.forEach((p, i) => {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: p.position },
      properties: {
        type: 'venue',
        venueId: p.venueId,
        venueName: p.venueName || 'Unknown',
        index: venues.length - i,
        // Future: add vibe colors here
        ...(p.vibeKey ? { vibeKey: p.vibeKey } : {}),
        ...(p.vibeHex ? { vibeHex: p.vibeHex } : {}),
      },
    } as any);
  });

  return { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection;
}