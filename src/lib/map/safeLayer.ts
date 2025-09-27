import type mapboxgl from 'mapbox-gl';
import { normalizeFilter } from './safeFilter';

/**
 * Safely add a layer to the map with filter normalization and error handling
 * @deprecated Consider using addLayerSafe from safeLayerHelpers.ts for new code
 */
export function addLayerSafe(map: mapboxgl.Map, layer: mapboxgl.Layer, beforeId?: string) {
  const l: any = { ...layer };
  if (Array.isArray(l.filter)) {
    l.filter = normalizeFilter(l.filter);
  }
  try {
    if (beforeId && map.getLayer(beforeId)) {
      map.addLayer(l, beforeId);
    } else {
      map.addLayer(l);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`addLayer failed for ${l.id}`, err, l.filter ?? null);
    // Fallback: try without beforeId
    try {
      map.addLayer(l);
    } catch (fallbackErr) {
      console.error(`addLayer fallback also failed for ${l.id}`, fallbackErr);
    }
  }
}