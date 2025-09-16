import type mapboxgl from 'mapbox-gl';

export function safeSetFilter(map: mapboxgl.Map, id: string, filter: any) {
  try {
    map.setFilter(id, filter as any);
  } catch (err) {
    // Keep map alive in dev; surface bad filters in console
    // eslint-disable-next-line no-console
    console.error(`setFilter failed for ${id}`, err, filter);
  }
}
