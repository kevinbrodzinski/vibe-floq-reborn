import mapboxgl from 'mapbox-gl';

/** Singleton Mapbox ref – null until WebMap fires "load". */
let map: mapboxgl.Map | null = null;
export const setMapInstance = (m: mapboxgl.Map | null) => { map = m; };

/** lng/lat ➜ screen px */
export const projectLatLng = (lng: number, lat: number) => {
  if (!map) {
    // Return fallback coordinates instead of throwing when map not ready
    return { x: 0, y: 0, invalid: true } as const;
  }
  const { x, y } = map.project([lng, lat]);
  return { x, y };
};

/** screen px ➜ lng/lat */
export const unprojectXY = (x: number, y: number) => {
  if (!map) throw new Error('Map instance not set');
  return map.unproject([x, y]);
};

/** Optional helper for consumers that must read the raw map */
export const getMapInstance = () => map;

/**
 * Convert meters to pixels at a given latitude and zoom level
 * Consolidated utility for consistent meters→pixels conversion across the app
 * Note: At high latitudes (>60°) the Mercator projection introduces significant error
 */
export const metersToPixelsAtLat = (meters: number, lat: number, zoom = 15) => {
  // Earth's circumference at equator in meters  
  const earthCircumference = 40075016.686;
  // Pixels per meter at zoom level 0 at equator
  const pixelsPerMeterAtEquator = 256 / earthCircumference;
  // Adjust for latitude using Mercator projection
  const metersPerPixel = Math.cos(lat * Math.PI / 180) * (2 ** zoom) * pixelsPerMeterAtEquator;
  return meters * metersPerPixel;
};