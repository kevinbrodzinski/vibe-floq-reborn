// src/lib/map/stylePersistence.ts
// Utilities to re-attach custom sources/layers after a Mapbox style change.

import type { FeatureCollection } from 'geojson';

export type ReaddFn = () => void;

/** Re-run `readd()` whenever the style is (re)loaded. Returns a cleanup fn. */
export function persistOnStyle(map: mapboxgl.Map, readd: ReaddFn) {
  const onStyleLoad = () => readd();
  const onStyleData = (e: any) => {
    // Only care when the style object itself changed (not 'source', 'tile', etc.)
    if (e?.dataType === 'style') readd();
  };

  // Call once now (in case the caller mounted after style load)
  try { readd(); } catch {}

  map.on('style.load', onStyleLoad);
  map.on('styledata', onStyleData);

  return () => {
    map.off('style.load', onStyleLoad);
    map.off('styledata', onStyleData);
  };
}

/** First symbol layer id (usually label layer). Useful as `beforeId` anchor. */
export function findFirstSymbolLayerId(map: mapboxgl.Map): string | undefined {
  const style = map.getStyle?.();
  if (!style?.layers) return undefined;
  const sym = style.layers.find((l: any) => l.type === 'symbol');
  return sym?.id;
}

/** Ensure a GeoJSON source exists, otherwise add it. Then set its data. */
export function ensureGeoJSONSource(map: mapboxgl.Map, sourceId: string, data: FeatureCollection) {
  const existing = map.getSource(sourceId) as any;
  if (!existing) {
    map.addSource(sourceId, { type: 'geojson', data });
  } else if (typeof existing.setData === 'function') {
    existing.setData(data);
  }
}

/** Add a layer if missing (optionally positioned before an anchor layer). */
export function ensureLayer(map: mapboxgl.Map, layer: mapboxgl.AnyLayer, beforeId?: string) {
  if (!map.getLayer(layer.id)) {
    if (beforeId) map.addLayer(layer, beforeId);
    else map.addLayer(layer);
  }
}