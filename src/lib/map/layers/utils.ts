/**
 * Safe layer mutation utilities
 * Guards against "layer does not exist" errors
 */

import type mapboxgl from 'mapbox-gl';

/**
 * Execute a function only if the layer exists
 * Silently ignores operations on missing layers
 */
export function withLayer(
  map: mapboxgl.Map, 
  id: string, 
  fn: () => void
): boolean {
  if (!map.getLayer(id)) {
    if (import.meta.env.DEV) {
      console.debug(`[withLayer] Layer ${id} does not exist, skipping operation`);
    }
    return false;
  }
  
  try {
    fn();
    return true;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn(`[withLayer] Operation failed on layer ${id}:`, e);
    }
    return false;
  }
}

/**
 * Safely set paint property on a layer
 */
export function setPaintPropertySafe(
  map: mapboxgl.Map,
  layerId: string,
  property: string,
  value: any
): boolean {
  return withLayer(map, layerId, () => {
    (map as any).setPaintProperty(layerId, property, value);
  });
}

/**
 * Safely set layout property on a layer
 */
export function setLayoutPropertySafe(
  map: mapboxgl.Map,
  layerId: string,
  property: string,
  value: any
): boolean {
  return withLayer(map, layerId, () => {
    (map as any).setLayoutProperty(layerId, property, value);
  });
}

/**
 * Safely set filter on a layer
 */
export function setFilterSafe(
  map: mapboxgl.Map,
  layerId: string,
  filter: any
): boolean {
  return withLayer(map, layerId, () => {
    map.setFilter(layerId, filter);
  });
}

/**
 * Safely move a layer
 */
export function moveLayerSafe(
  map: mapboxgl.Map,
  layerId: string,
  beforeId?: string
): boolean {
  return withLayer(map, layerId, () => {
    if (beforeId && map.getLayer(beforeId)) {
      map.moveLayer(layerId, beforeId);
    } else if (beforeId) {
      console.debug(`[moveLayerSafe] beforeId ${beforeId} does not exist, moving to top`);
      map.moveLayer(layerId);
    } else {
      map.moveLayer(layerId);
    }
  });
}