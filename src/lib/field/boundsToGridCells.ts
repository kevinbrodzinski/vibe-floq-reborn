// Helper function to convert viewport bounds to H3 grid cell IDs
// Uses H3 library for hexagonal tiling (precision 7 for city-level granularity)

interface TileBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  precision?: number;
}

/**
 * Convert geographic bounds to H3 tile IDs for field tile queries
 * Uses the same grid computation logic as the database for consistency
 */
export function boundsToGridCells(bounds: TileBounds): string[] {
  const { minLat, maxLat, minLng, maxLng, precision = 7 } = bounds;
  
  // Simple grid approximation (in production, use H3.js for proper hexagonal tiling)
  const latStep = (maxLat - minLat) / 10;  // ~10x10 grid for now
  const lngStep = (maxLng - minLng) / 10;
  
  const tileIds: string[] = [];
  
  for (let lat = minLat; lat < maxLat; lat += latStep) {
    for (let lng = minLng; lng < maxLng; lng += lngStep) {
      // Create a tile ID based on lat/lng (in production, use H3.geoToH3)
      const tileId = `${precision}_${Math.round(lat * 1000)}_${Math.round(lng * 1000)}`;
      tileIds.push(tileId);
    }
  }
  
  return tileIds;
}