import mapboxgl from 'mapbox-gl';

/** Singleton Mapbox ref – null until WebMap fires "load". */
let map: mapboxgl.Map | null = null;

/** Map-ready listeners for React-style reactivity */
const mapReadyListeners: (() => void)[] = [];

/** Set map instance and notify all listeners */
export const setMapInstance = (m: mapboxgl.Map | null) => { 
  map = m; 
  if (m) {
    // Notify all waiting listeners that map is ready
    mapReadyListeners.forEach(fn => fn());
    mapReadyListeners.length = 0; // Clear listeners after notification
  }
};

/** Subscribe to map ready event */
export const onMapReady = (fn: () => void) => {
  if (map && map.isStyleLoaded()) {
    // Map already ready, call immediately
    fn();
  } else {
    // Queue for when map becomes ready
    mapReadyListeners.push(fn);
  }
};

/** 
 * Safe projection function that returns null if map not ready
 * Use this instead of projectLatLng to avoid console spam
 */
export const projectToScreen = (lat: number, lng: number): { x: number; y: number } | null => {
  if (!map || !map.isStyleLoaded()) {
    // Map not ready → skip projection; caller can decide what to do
    return null;
  }
  
  const { x, y } = map.project([lng, lat]);
  return { x, y };
};

/** lng/lat ➜ screen px (throws if map not ready - legacy function) */
export const projectLatLng = (lng: number, lat: number): { x: number; y: number } => {
  if (!map) throw new Error('Map instance not set');
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