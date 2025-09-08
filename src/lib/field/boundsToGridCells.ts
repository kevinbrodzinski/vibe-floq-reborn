// Convert geographical bounds to grid cell IDs for field tiles
interface TileBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  precision?: number;
}

/**
 * Converts geographical bounds to grid cell IDs compatible with vibes_now h3_grid
 * Uses the same grid computation as the database for consistency
 */
export function boundsToGridCells(bounds: TileBounds): string[] {
  if (!bounds) return [];

  const { minLat, maxLat, minLng, maxLng } = bounds;
  const gridCells: string[] = [];

  // Use same precision as database function (1000x scale)
  const latStep = 0.001; // ~111m at equator
  const lngStep = 0.001; // varies by latitude

  // Generate grid cells covering the bounds
  for (let lat = minLat; lat <= maxLat; lat += latStep) {
    for (let lng = minLng; lng <= maxLng; lng += lngStep) {
      const gridId = computeH3Grid(lat, lng);
      if (!gridCells.includes(gridId)) {
        gridCells.push(gridId);
      }
    }
  }

  return gridCells.sort();
}

/**
 * Compute grid cell ID using same logic as database function
 */
function computeH3Grid(lat: number, lng: number): string {
  const latPart = Math.floor((lat + 90) * 1000).toString().padStart(5, '0');
  const lngPart = Math.floor((lng + 180) * 1000).toString().padStart(5, '0');
  return `${latPart}_${lngPart}`;
}