/**
 * User aura layer management with race condition protection
 * Handles style reloads and ensures layers always exist before manipulation
 */

import type mapboxgl from 'mapbox-gl';
import { 
  SRC_USER_AURA, 
  LYR_USER_AURA_OUTER, 
  LYR_USER_AURA_INNER, 
  LYR_USER_AURA_DOT, 
  LYR_USER_AURA_HIT,
  BEFORE_SYMBOLS 
} from '../ids';
import { ensureLayer, ensureSource, removeLayerSafe, removeSourceSafe } from '../ensure';

export type AuraData = {
  lng: number;
  lat: number;
  colorHex: string;      // e.g. "#FF4477"
  confidence01: number;  // 0..1
};

export type AuraFeature = GeoJSON.Feature<GeoJSON.Point, {
  userId: string;
  energy?: number;
  radius?: number;
  colorHex?: string;
  confidence?: number;
}>;

/**
 * Create or update the user aura layers
 * Safe to call multiple times - will only create missing layers
 */
export function upsertUserAura(
  map: mapboxgl.Map,
  fc: GeoJSON.FeatureCollection<GeoJSON.Point>
): void {
  if (!map.isStyleLoaded()) {
    console.debug('[upsertUserAura] Style not loaded, deferring');
    return;
  }

  // Ensure source exists
  ensureSource(map, SRC_USER_AURA, {
    type: 'geojson',
    data: fc
  });

  // Ensure all aura layers exist (outer, inner, dot, hit)
  const beforeId = map.getLayer(BEFORE_SYMBOLS) ? BEFORE_SYMBOLS : undefined;
  
  // Outer aura (largest, most transparent)
  ensureLayer(map, {
    id: LYR_USER_AURA_OUTER,
    type: 'circle',
    source: SRC_USER_AURA,
    filter: ['all', ['==', '$type', 'Point']],
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        10, 40, 16, 80, 20, 120
      ],
      'circle-color': [
        'coalesce', 
        ['get', 'colorHex'],
        '#70ffa8'
      ],
      'circle-opacity': [
        'interpolate', ['linear'], 
        ['coalesce', ['get', 'confidence'], 0.5],
        0, 0.05, 0.5, 0.15, 1, 0.25
      ],
      'circle-blur': 1.0
    }
  }, beforeId);

  // Inner aura (medium size, medium opacity)
  ensureLayer(map, {
    id: LYR_USER_AURA_INNER,
    type: 'circle',
    source: SRC_USER_AURA,
    filter: ['all', ['==', '$type', 'Point']],
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        10, 20, 16, 40, 20, 60
      ],
      'circle-color': [
        'coalesce', 
        ['get', 'colorHex'],
        '#70ffa8'
      ],
      'circle-opacity': [
        'interpolate', ['linear'], 
        ['coalesce', ['get', 'confidence'], 0.5],
        0, 0.15, 0.5, 0.35, 1, 0.55
      ],
      'circle-blur': 0.6
    }
  }, beforeId);

  // Center dot (smallest, most opaque)
  ensureLayer(map, {
    id: LYR_USER_AURA_DOT,
    type: 'circle',
    source: SRC_USER_AURA,
    filter: ['all', ['==', '$type', 'Point']],
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        10, 6, 16, 12, 20, 18
      ],
      'circle-color': [
        'coalesce', 
        ['get', 'colorHex'],
        '#70ffa8'
      ],
      'circle-opacity': [
        'interpolate', ['linear'], 
        ['coalesce', ['get', 'confidence'], 0.5],
        0, 0.6, 0.5, 0.8, 1, 1.0
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.8
    }
  }, beforeId);

  // Invisible hit target (for interactions)
  ensureLayer(map, {
    id: LYR_USER_AURA_HIT,
    type: 'circle',
    source: SRC_USER_AURA,
    filter: ['all', ['==', '$type', 'Point']],
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        10, 50, 16, 90, 20, 130
      ],
      'circle-color': 'transparent',
      'circle-opacity': 0
    }
  }, beforeId);

  // Update data if source already existed
  const src = map.getSource(SRC_USER_AURA) as mapboxgl.GeoJSONSource;
  if (src && src.setData) {
    src.setData(fc);
  }
}

/**
 * Rebuild user aura layers after style reload
 * Call this on 'styledata' events to restore custom layers
 */
export function rebuildUserAura(map: mapboxgl.Map): void {
  if (!map.isStyleLoaded()) {
    console.debug('[rebuildUserAura] Style not loaded, deferring');
    return;
  }

  // Get existing data if source exists
  const src = map.getSource(SRC_USER_AURA) as mapboxgl.GeoJSONSource | undefined;
  const data = src ? (src as any)._data as GeoJSON.FeatureCollection<GeoJSON.Point> : {
    type: 'FeatureCollection' as const, 
    features: []
  };

  // Rebuild with existing data
  upsertUserAura(map, data);
}

/**
 * Remove all user aura layers and source
 */
export function removeUserAura(map: mapboxgl.Map): void {
  removeLayerSafe(map, LYR_USER_AURA_HIT);
  removeLayerSafe(map, LYR_USER_AURA_DOT);
  removeLayerSafe(map, LYR_USER_AURA_INNER);
  removeLayerSafe(map, LYR_USER_AURA_OUTER);
  removeSourceSafe(map, SRC_USER_AURA);
}

/**
 * Update user aura data (position, color, confidence)
 */
export function updateUserAura(
  map: mapboxgl.Map,
  auraData: AuraData | null
): void {
  const fc: GeoJSON.FeatureCollection<GeoJSON.Point> = {
    type: 'FeatureCollection',
    features: auraData ? [{
      type: 'Feature',
      geometry: { 
        type: 'Point', 
        coordinates: [auraData.lng, auraData.lat] 
      },
      properties: {
        userId: 'current-user',
        colorHex: auraData.colorHex,
        confidence: auraData.confidence01,
        energy: auraData.confidence01,
        radius: Math.round(auraData.confidence01 * 100)
      }
    }] : []
  };

  upsertUserAura(map, fc);
}