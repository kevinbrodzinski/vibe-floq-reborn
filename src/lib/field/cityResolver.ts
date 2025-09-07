// City resolver utility for Phase 4 winds
export function currentCityId(): string {
  // TODO: Derive from user location or viewport context
  // For now, return default UUID (SF area placeholder)
  return '00000000-0000-0000-0000-000000000000';
}

export function resolveFromViewport(viewportGeo?: {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}): string {
  if (!viewportGeo) return currentCityId();
  
  // Simple heuristic: SF Bay Area bounds
  const centerLat = (viewportGeo.minLat + viewportGeo.maxLat) / 2;
  const centerLng = (viewportGeo.minLng + viewportGeo.maxLng) / 2;
  
  // SF Bay Area rough bounds
  if (centerLat >= 37.2 && centerLat <= 38.0 && centerLng >= -122.6 && centerLng <= -121.8) {
    return '00000000-0000-0000-0000-000000000000'; // SF placeholder
  }
  
  // TODO: Add more city mappings as data expands
  return currentCityId();
}