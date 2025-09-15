// User location aura overlay spec for LayerManager
// Creates a multi-layered vibe-colored aura around user location

import type mapboxgl from 'mapbox-gl';
import { vibeRgba } from '@/lib/map/vibeColor';

export type AuraData = {
  lng: number;
  lat: number;
  colorHex: string;      // e.g. "#FF4477"
  confidence01: number;  // 0..1
};

const SRC_ID = 'user-aura-src';
const LAYER_ID_DOT = 'user-aura-dot';
const LAYER_ID_INNER = 'user-aura-inner';
const LAYER_ID_OUTER = 'user-aura-outer';

function hexToRgba(hex: string, alpha: number): string {
  // #RRGGBB -> rgba(r,g,b,a)
  const m = hex.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (!m) return hex; // fallback as-is
  let h = m[1];
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

function ensureSource(map: mapboxgl.Map) {
  if (!map.getSource(SRC_ID)) {
    map.addSource(SRC_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
  }
}

function addLayers(map: mapboxgl.Map, beforeId?: string) {
  // Outer soft aura
  if (!map.getLayer(LAYER_ID_OUTER)) {
    map.addLayer({
      id: LAYER_ID_OUTER,
      type: 'circle',
      source: SRC_ID,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          10, 20,
          14, 40,
          16, 65
        ],
        'circle-color': vibeRgba(0.20),     // will be updated
        'circle-blur': 0.7,                 // soft aura edge
        'circle-opacity': 1.0               // alpha embedded in color
      }
    }, beforeId);
  }

  // Inner ring for definition
  if (!map.getLayer(LAYER_ID_INNER)) {
    map.addLayer({
      id: LAYER_ID_INNER,
      type: 'circle',
      source: SRC_ID,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          10, 10,
          14, 20,
          16, 35
        ],
        'circle-color': vibeRgba(0.35),     // will be updated
        'circle-blur': 0.35,
        'circle-opacity': 1.0
      }
    }, beforeId ?? LAYER_ID_OUTER);
  }

  // Center dot
  if (!map.getLayer(LAYER_ID_DOT)) {
    map.addLayer({
      id: LAYER_ID_DOT,
      type: 'circle',
      source: SRC_ID,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          10, 3.5,
          14, 4.5,
          16, 6
        ],
        'circle-color': vibeRgba(1.0),      // will be updated
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 1.5,
        'circle-opacity': 1.0
      }
    }, beforeId ?? LAYER_ID_INNER);
  }
}

function removeLayers(map: mapboxgl.Map) {
  [LAYER_ID_DOT, LAYER_ID_INNER, LAYER_ID_OUTER].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource(SRC_ID)) map.removeSource(SRC_ID);
}

function setData(map: mapboxgl.Map, data: AuraData) {
  let src = map.getSource(SRC_ID) as mapboxgl.GeoJSONSource | undefined;
  if (!src) { ensureSource(map); src = map.getSource(SRC_ID) as mapboxgl.GeoJSONSource | undefined; }
  if (!src) return;
  
  const fc: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [data.lng, data.lat] }
    }]
  };
  src.setData(fc);

  // Confidence affects aura intensity
  const c = Math.max(0, Math.min(1, data.confidence01));
  const outerAlpha = 0.10 + 0.20 * c; // 0.10..0.30
  const innerAlpha = 0.20 + 0.35 * c; // 0.20..0.55

  const outerColor = hexToRgba(data.colorHex, outerAlpha);
  const innerColor = hexToRgba(data.colorHex, innerAlpha);
  const dotColor = data.colorHex;

  // Update layer colors
  if (map.getLayer(LAYER_ID_OUTER)) {
    map.setPaintProperty(LAYER_ID_OUTER, 'circle-color', outerColor);
  }
  if (map.getLayer(LAYER_ID_INNER)) {
    map.setPaintProperty(LAYER_ID_INNER, 'circle-color', innerColor);
  }
  if (map.getLayer(LAYER_ID_DOT)) {
    map.setPaintProperty(LAYER_ID_DOT, 'circle-color', dotColor);
  }
}

/**
 * LayerManager-compatible overlay spec for user location aura
 */
export function createUserAuraSpec(beforeId?: string) {
  return {
    id: 'user-aura',
    mount(map: mapboxgl.Map) {
      if (!map.isStyleLoaded()) {
        // Ensure mount happens after style ready
        const re = () => { this.mount(map); };
        map.once('idle', re);
        return;
      }
      ensureSource(map);
      addLayers(map, beforeId);
    },
    update(map: mapboxgl.Map, data?: AuraData) {
      if (!data) return;
      if (!map.getSource(SRC_ID)) ensureSource(map);
      setData(map, data);
    },
    unmount(map: mapboxgl.Map) {
      removeLayers(map);
    }
  };
}