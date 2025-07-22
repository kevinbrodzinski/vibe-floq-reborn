import mapboxgl from 'mapbox-gl';

/**
 * Singleton Mapbox map reference so any component can project/unproject
 * without prop-drilling.
 */
let map: mapboxgl.Map | null = null;

export const setMapInstance = (m: mapboxgl.Map | null) => {
  map = m;
};

/** Pixel-perfect projection  (lng, lat ➜ screen x y) */
export const projectLatLng = (lng: number, lat: number) => {
  if (!map) throw new Error('Map instance not set');
  /* Mapbox expects [lng, lat] order */
  const { x, y } = map.project([lng, lat]);
  return { x, y };
};

/** Inverse projection (x y ➜ lng lat) */
export const unprojectXY = (x: number, y: number) => {
  if (!map) throw new Error('Map instance not set');
  return map.unproject([x, y]); // → {lng, lat}
};

/** Optional helper for consumers that must read the raw map */
export const getMapInstance = () => map;