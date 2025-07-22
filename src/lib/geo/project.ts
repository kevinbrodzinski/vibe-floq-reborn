import mapboxgl from 'mapbox-gl';

/** Singleton Mapbox ref – null until WebMap fires "load". */
let map: mapboxgl.Map | null = null;
export const setMapInstance = (m: mapboxgl.Map | null) => { map = m; };

/** lng/lat ➜ screen px */
export const projectLatLng = (lng: number, lat: number) => {
  if (!map) throw new Error('Map instance not set');
  const { x, y } = map.project([lng, lat]);
  return { x, y };
};

/** screen px ➜ lng/lat */
export const unprojectXY = (x: number, y: number) => {
  if (!map) throw new Error('Map instance not set');
  return map.unproject([x, y]);
};