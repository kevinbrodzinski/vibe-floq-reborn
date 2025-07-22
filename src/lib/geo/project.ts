import mapboxgl from 'mapbox-gl';

// Singleton map reference
let map: mapboxgl.Map | null = null;

export const setMapInstance = (m: mapboxgl.Map) => {
  map = m;
  console.log('Map instance registered for projection');
};

export const projectLatLng = (lng: number, lat: number) => {
  if (!map) throw new Error('Map instance not set');
  const { x, y } = map.project([lng, lat]);
  return { x, y };
};

export const unprojectXY = (x: number, y: number) => {
  if (!map) throw new Error('Map instance not set');
  return map.unproject([x, y]); // {lng, lat}
};

export const getMapInstance = () => map;