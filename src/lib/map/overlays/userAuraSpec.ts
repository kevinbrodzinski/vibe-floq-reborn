// User location aura overlay spec for LayerManager
// Creates a multi-layered vibe-colored aura around user location

// Cache coordinates for safe recenter operations
let lastPoint: [number, number] | null = null;

import type mapboxgl from 'mapbox-gl';
import { vibeRgba } from '@/lib/map/vibeColor';
import {
  LYR_USER_AURA_OUTER,
  LYR_USER_AURA_INNER,
  LYR_USER_AURA_DOT,
  LYR_USER_AURA_HIT,
  AURA_BEFORE,
} from '@/lib/map/ids';
import {
  setPaintPropertySafe,
  setLayoutPropertySafe,
  moveLayerSafe,
} from '@/lib/map/layers/utils';
import { setFilterWhenReady } from '@/lib/map/safeFilter';

/** Resolve a safe 'before' layer id if the requested one doesn't exist */
function resolveBefore(map: mapboxgl.Map, requested?: string): string | undefined {
  // If requested exists, use it
  if (requested && map.getLayer(requested)) return requested;
  // Prefer inserting beneath labels if possible
  const preferred = ['poi-label', 'road-label', 'place-label', 'poi'];
  for (const id of preferred) if (map.getLayer(id)) return id;
  // Else, find the topmost symbol layer as anchor
  const layers = map.getStyle()?.layers ?? [];
  for (let i = layers.length - 1; i >= 0; i--) {
    if (layers[i].type === 'symbol') return layers[i].id;
  }
  // Fallback: undefined (adds to top)
  return undefined;
}

export type AuraData = {
  lng: number;
  lat: number;
  colorHex: string;      // e.g. "#FF4477"
  confidence01: number;  // 0..1
};

const SRC_ID = 'user-aura-src';

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


function addLayers(map: mapboxgl.Map, onMouseEnter: () => void, onMouseLeave: () => void, dragging: () => boolean, beforeId?: string) {
  // Use dynamic layer resolution for stable anchoring
  const anchor = resolveBefore(map, beforeId);
  
  // Outer soft aura
  if (!map.getLayer(LYR_USER_AURA_OUTER)) {
    map.addLayer({
      id: LYR_USER_AURA_OUTER,
      type: 'circle',
      source: SRC_ID,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          10, 24,
          14, 48,
          16, 80
        ],
        'circle-color': vibeRgba(0.20),     // will be updated
        'circle-blur': 0.75,                // buttery edge
        'circle-opacity': 1.0               // alpha embedded in color
      }
    }, anchor);
  }

  // Inner ring for definition
  if (!map.getLayer(LYR_USER_AURA_INNER)) {
    map.addLayer({
      id: LYR_USER_AURA_INNER,
      type: 'circle',
      source: SRC_ID,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          10, 12,
          14, 26,
          16, 44
        ],
        'circle-color': vibeRgba(0.35),     // will be updated
        'circle-blur': 0.35,
        'circle-opacity': 1.0
      }
    }, anchor);
  }

  // Center dot
  if (!map.getLayer(LYR_USER_AURA_DOT)) {
    map.addLayer({
      id: LYR_USER_AURA_DOT,
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
        'circle-stroke-color': 'rgba(0,0,0,0.55)', // subtle dark edge
        'circle-stroke-width': 1.25,
        'circle-opacity': 1.0
      }
    }, anchor);
  }

  // Large invisible hit target for tap
  if (!map.getLayer(LYR_USER_AURA_HIT)) {
    map.addLayer({
      id: LYR_USER_AURA_HIT,
      type: 'circle',
      source: SRC_ID,
      paint: {
        'circle-radius': 26,
        'circle-pitch-scale': 'viewport',
        'circle-opacity': 0.01,
        'circle-color': '#000'
      }
    }, anchor);
  }

  // Cursor affordance (desktop)
  map.on('mouseenter', LYR_USER_AURA_HIT, onMouseEnter);
  map.on('mouseleave', LYR_USER_AURA_HIT, onMouseLeave);

  // Click → fire the same event the friend layer uses
  map.on('click', LYR_USER_AURA_HIT, () => {
    if (dragging() || map.isMoving() || !lastPoint) return; // guard against accidental clicks

    // Pull current vibe color from CSS var set by useVibeEngine
    let colorHex = '#22d3ee';
    try {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--vibe-hex').trim();
      if (raw) colorHex = raw;
    } catch {}

    window.dispatchEvent(new CustomEvent('friends:select', {
      detail: {
        kind: 'self',
        id: 'self',
        name: 'You',
        avatarUrl: undefined,   // fill if you have a local profile photo
        color: colorHex,
        lngLat: { lng: lastPoint[0], lat: lastPoint[1] }
      }
    }));
  });
}

function removeLayers(map: mapboxgl.Map) {
  [LYR_USER_AURA_HIT, LYR_USER_AURA_DOT, LYR_USER_AURA_INNER, LYR_USER_AURA_OUTER].forEach(id => {
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
  
  // Cache point for safe recenter operations
  lastPoint = [data.lng, data.lat];
  
  // Expose to global for highlight function (avoid private API)
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__floq_lastPoint = lastPoint;
  }

  // Confidence affects aura intensity (stronger, more visible defaults)
  const c = Math.max(0, Math.min(1, data.confidence01));
  const outerAlpha = 0.18 + 0.22 * c; // 0.18..0.40 (strong but soft)
  const innerAlpha = 0.30 + 0.35 * c; // 0.30..0.65

  const outerColor = hexToRgba(data.colorHex, outerAlpha);
  const innerColor = hexToRgba(data.colorHex, innerAlpha);
  const dotColor = data.colorHex;

  // Update layer colors using safe helpers
  setPaintPropertySafe(map, LYR_USER_AURA_OUTER, 'circle-color', outerColor);
  setPaintPropertySafe(map, LYR_USER_AURA_INNER, 'circle-color', innerColor);
  setPaintPropertySafe(map, LYR_USER_AURA_DOT, 'circle-color', dotColor);
}

/**
 * LayerManager-compatible overlay spec for user location aura
 */
export function createUserAuraSpec(beforeId?: string) {
  let isDragging = false;


  const onDragStart = () => { isDragging = true; };
  const onDragEnd = () => { setTimeout(() => isDragging = false, 120); };
  const onMouseEnter = (map: mapboxgl.Map) => () => { map.getCanvas().style.cursor = 'pointer'; };
  const onMouseLeave = (map: mapboxgl.Map) => () => { map.getCanvas().style.cursor = ''; };

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
      addLayers(map, onMouseEnter(map), onMouseLeave(map), () => isDragging, beforeId);
      
      // Drag guards
      map.on('dragstart', onDragStart);
      map.on('dragend', onDragEnd);

      if (import.meta.env.DEV) {
        console.debug('[AuraSpec] mounted:', {
          dot:   !!map.getLayer(LYR_USER_AURA_DOT),
          inner: !!map.getLayer(LYR_USER_AURA_INNER),
          outer: !!map.getLayer(LYR_USER_AURA_OUTER),
          before: resolveBefore(map, beforeId)
        });
      }
    },
    update(map: mapboxgl.Map, data?: AuraData) {
      if (!data) return;
      if (!map.getSource(SRC_ID)) ensureSource(map);
      setData(map, data);
    },
    unmount(map: mapboxgl.Map) {
      try {
        map.off('dragstart', onDragStart);
        map.off('dragend', onDragEnd);
        map.off('mouseenter', LYR_USER_AURA_HIT, onMouseEnter(map));
        map.off('mouseleave', LYR_USER_AURA_HIT, onMouseLeave(map));
      } catch {}
      removeLayers(map);
    }
  };
}