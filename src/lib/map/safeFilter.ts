import type mapboxgl from 'mapbox-gl';

export function safeSetFilter(map: mapboxgl.Map, id: string, filter: any): boolean {
  try {
    if (map.getLayer(id)) {
      map.setFilter(id, filter as any);
      return true;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`setFilter failed for ${id}`, err, filter);
  }
  return false;
}
