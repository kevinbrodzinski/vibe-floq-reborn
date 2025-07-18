import { encode, decode } from 'ngeohash';

/**
 * Generate geohash tile IDs for a viewport using a grid approach
 */
export function tilesForViewport(
  nw: [number, number], 
  se: [number, number], 
  precision: number = 5
): string[] {
  const ids = new Set<string>();
  const step = 0.025; // degrees - roughly 2.5km at equator
  
  // Ensure correct bounds (nw should be top-left, se should be bottom-right)
  const northLat = Math.max(nw[0], se[0]);
  const southLat = Math.min(nw[0], se[0]);
  const westLng = Math.min(nw[1], se[1]);
  const eastLng = Math.max(nw[1], se[1]);
  
  // Generate grid of points and get their geohashes
  for (let lat = southLat; lat <= northLat; lat += step) {
    for (let lng = westLng; lng <= eastLng; lng += step) {
      const hash = encode(lat, lng, precision);
      ids.add(hash.slice(0, precision));
    }
  }
  
  return Array.from(ids);
}

/**
 * Get the center point of a geohash
 */
export function geohashToCenter(geohash: string): [number, number] {
  const { latitude, longitude } = decode(geohash);
  return [latitude, longitude];
}

/**
 * Convert HSL color object to CSS hsl string
 */
export function hslToString(hsl: { h: number; s: number; l: number }): string {
  return `hsl(${hsl.h}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%)`;
}

/**
 * Calculate radius based on crowd count
 */
export function crowdCountToRadius(count: number): number {
  // Logarithmic scaling for better visual distribution
  const baseRadius = 20;
  const scale = Math.log(count + 1) * 8;
  return Math.min(baseRadius + scale, 100); // Cap at 100px
}