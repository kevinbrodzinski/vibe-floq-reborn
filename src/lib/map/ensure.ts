/**
 * Safe upsert helpers for Mapbox sources and layers
 * Prevents "does not exist" errors during style transitions
 */

import type mapboxgl from 'mapbox-gl';
import { normalizeFilter } from './safeFilter';

/**
 * Ensures a source exists, adds it if missing
 * Returns true if source was created, false if it already existed
 */
export function ensureSource(
  map: mapboxgl.Map,
  id: string,
  def: mapboxgl.AnySourceData
): boolean {
  const exists = !!map.getSource(id);
  if (!exists) {
    try {
      map.addSource(id, def);
    } catch (e) {
      console.warn(`[ensureSource] Failed to add source ${id}:`, e);
      return false;
    }
  }
  return !exists;
}

/**
 * Ensures a layer exists, adds it if missing
 * Returns true if layer was created, false if it already existed
 */
export function ensureLayer(
  map: mapboxgl.Map,
  layer: mapboxgl.AnyLayer,
  beforeId?: string
): boolean {
  const exists = !!map.getLayer(layer.id);
  if (!exists) {
    try {
      const clone = JSON.parse(JSON.stringify(layer)) as mapboxgl.AnyLayer;
      
      // Normalize Mapbox filter grammar (guards against invalid filter expressions)
      if ('filter' in clone && clone.filter) {
        clone.filter = normalizeFilter(clone.filter as any);
      }
      
      // Add layer with optional beforeId
      if (beforeId && map.getLayer(beforeId)) {
        map.addLayer(clone, beforeId);
      } else {
        map.addLayer(clone);
      }
    } catch (e) {
      console.warn(`[ensureLayer] Failed to add layer ${layer.id}:`, e);
      return false;
    }
  }
  return !exists;
}

/**
 * Safely removes a layer if it exists
 */
export function removeLayerSafe(map: mapboxgl.Map, layerId: string): void {
  try {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  } catch (e) {
    console.warn(`[removeLayerSafe] Failed to remove layer ${layerId}:`, e);
  }
}

/**
 * Safely removes a source if it exists
 */
export function removeSourceSafe(map: mapboxgl.Map, sourceId: string): void {
  try {
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  } catch (e) {
    console.warn(`[removeSourceSafe] Failed to remove source ${sourceId}:`, e);
  }
}