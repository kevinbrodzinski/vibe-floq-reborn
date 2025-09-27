import mapboxgl from 'mapbox-gl';

/**
 * Safely add a layer to the map, handling missing beforeId gracefully
 */
export function addLayerSafe(
  map: mapboxgl.Map,
  layer: mapboxgl.AnyLayer,
  beforeId?: string
): void {
  try {
    if (beforeId && map.getLayer(beforeId)) {
      map.addLayer(layer, beforeId);
    } else {
      map.addLayer(layer);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[addLayerSafe] Failed to add layer ${layer.id}:`, error);
    }
    // Fallback: try without beforeId
    try {
      map.addLayer(layer);
    } catch (fallbackError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[addLayerSafe] Fallback failed for layer ${layer.id}:`, fallbackError);
      }
    }
  }
}

/**
 * Check if a layer exists and is ready
 */
export function isLayerReady(map: mapboxgl.Map, layerId: string): boolean {
  try {
    return !!map.getLayer(layerId);
  } catch {
    return false;
  }
}

/**
 * Safely remove a layer, handling missing layer gracefully
 */
export function removeLayerSafe(map: mapboxgl.Map, layerId: string): void {
  try {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[removeLayerSafe] Failed to remove layer ${layerId}:`, error);
    }
  }
}