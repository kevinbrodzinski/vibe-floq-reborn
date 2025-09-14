import { gradientStops } from '@/lib/vibe/color';

/**
 * Applies a vibe-based gradient to a Mapbox line layer
 * @param map - Mapbox map instance
 * @param layerId - Layer ID to apply gradient to
 * @param userHex - User's vibe color (hex)
 * @param venueHex - Venue's vibe color (hex)
 */
export function applyVibeGradient(
  map: mapboxgl.Map, 
  layerId: string, 
  userHex: string, 
  venueHex: string
) {
  const [g0, g1, g2, g3] = gradientStops(userHex, venueHex);
  
  map.setPaintProperty(layerId, 'line-gradient', [
    'interpolate', ['linear'], ['line-progress'],
    g0[0], ['to-color', g0[1]],
    g1[0], ['to-color', g1[1]], 
    g2[0], ['to-color', g2[1]],
    g3[0], ['to-color', g3[1]],
  ]);
}

/**
 * Creates a radial gradient for vibe visualization on map
 * @param userHex - Center color (user vibe)
 * @param venueHex - Edge color (venue vibe)
 * @returns CSS radial gradient string
 */
export function createVibeRadialGradient(userHex: string, venueHex: string): string {
  const stops = gradientStops(userHex, venueHex);
  const cssStops = stops.map(([pos, color]) => `${color} ${Math.round(pos * 100)}%`).join(', ');
  return `radial-gradient(circle, ${cssStops})`;
}