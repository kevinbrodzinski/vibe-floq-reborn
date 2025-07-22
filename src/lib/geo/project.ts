import type mapboxgl from 'mapbox-gl';

export interface ScreenXY { x: number; y: number }
export interface LatLng { lng: number; lat: number }

/** current Mapbox instance (set once by WebMap) */
let map: mapboxgl.Map;

/** Call once after the map mounts */
export function setMapInstance(m: mapboxgl.Map) {
  map = m;
}

export function projectLatLng(lng: number, lat: number): ScreenXY {
  if (!map) {
    const error = 'projectLatLng: map instance not set';
    if (process.env.NODE_ENV !== 'production') {
      console.warn(error + ' - ensure setMapInstance() is called after map loads');
    }
    throw new Error(error);
  }
  const { x, y } = map.project([lng, lat]);
  return { x, y };
}

export function unprojectXY(x: number, y: number): LatLng {
  if (!map) {
    const error = 'unprojectXY: map instance not set';
    if (process.env.NODE_ENV !== 'production') {
      console.warn(error + ' - ensure setMapInstance() is called after map loads');
    }
    throw new Error(error);
  }
  const { lng, lat } = map.unproject([x, y]);
  return { lng, lat };
}

/**
 * Get current map instance for advanced operations
 * @throws Error if map not set
 */
export function getMapInstance(): mapboxgl.Map {
  if (!map) throw new Error('getMapInstance: map instance not set');
  return map;
}