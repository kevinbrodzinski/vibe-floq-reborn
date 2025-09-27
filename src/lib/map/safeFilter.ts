/**
 * Safe filter normalization for Mapbox GL JS
 * Prevents filter expression errors
 */

export function normalizeFilter(filter: any): any {
  if (!filter) return filter;
  
  // Handle array-based filters (most common case)
  if (Array.isArray(filter)) {
    return filter.map(item => {
      if (Array.isArray(item)) {
        return normalizeFilter(item);
      }
      return item;
    });
  }
  
  // Return as-is for other types
  return filter;
}

/**
 * Safely set filter on a layer, checking if layer exists first
 */
export function safeSetFilter(map: any, layerId: string, filter: any): boolean {
  try {
    if (!map.getLayer(layerId)) {
      return false;
    }
    map.setFilter(layerId, normalizeFilter(filter));
    return true;
  } catch (e) {
    console.warn(`[safeSetFilter] Failed to set filter on ${layerId}:`, e);
    return false;
  }
}

/**
 * Set filter when layer is ready (waits for layer to exist)
 */
export function setFilterWhenReady(map: any, layerId: string, filter: any): void {
  const trySet = () => {
    if (safeSetFilter(map, layerId, filter)) {
      return; // Success
    }
    // Retry after a short delay
    setTimeout(trySet, 50);
  };
  trySet();
}