import type mapboxgl from 'mapbox-gl';
import { normalizeFilter } from './safeFilter';

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
  }
}