/**
 * Place label resolver - maps viewport coordinates to neighborhood names
 * TODO: Wire to neighborhoods service; currently uses dev mapping
 */

export function placeLabelFromViewport(centerLat: number, centerLng: number): string | undefined {
  // Los Angeles area mapping (dev defaults)
  if (centerLat > 33.95 && centerLat < 34.05 && centerLng > -118.5 && centerLng < -118.35) {
    return 'Venice';
  }
  if (centerLat > 34.05 && centerLat < 34.08 && centerLng > -118.26 && centerLng < -118.22) {
    return 'Arts District';
  }
  if (centerLat > 34.05 && centerLat < 34.15 && centerLng > -118.35 && centerLng < -118.20) {
    return 'Hollywood';
  }
  if (centerLat > 34.00 && centerLat < 34.10 && centerLng > -118.50 && centerLng < -118.40) {
    return 'Santa Monica';
  }
  if (centerLat > 34.05 && centerLat < 34.12 && centerLng > -118.30 && centerLng < -118.20) {
    return 'Downtown LA';
  }
  
  // San Francisco area
  if (centerLat > 37.70 && centerLat < 37.80 && centerLng > -122.50 && centerLng < -122.35) {
    return 'Mission District';
  }
  if (centerLat > 37.75 && centerLat < 37.82 && centerLng > -122.45 && centerLng < -122.38) {
    return 'SOMA';
  }
  
  // New York area  
  if (centerLat > 40.70 && centerLat < 40.78 && centerLng > -74.02 && centerLng < -73.95) {
    return 'Manhattan';
  }
  if (centerLat > 40.65 && centerLat < 40.72 && centerLng > -74.00 && centerLng < -73.92) {
    return 'Brooklyn';
  }
  
  // Generic fallbacks
  return undefined;
}

/**
 * Get place label with fallback to coordinate-based name
 */
export function getPlaceLabel(centerLat: number, centerLng: number): string | undefined {
  const label = placeLabelFromViewport(centerLat, centerLng);
  if (label) return label;
  
  // Could add coordinate-to-city lookup here
  // For now, return undefined to keep status generic
  return undefined;
}
