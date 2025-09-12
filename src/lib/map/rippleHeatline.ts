import type mapboxgl from 'mapbox-gl';

export type RippleEdge = {
  from: { lng: number; lat: number };
  to: { lng: number; lat: number };
  weight: number;         // 0..1
  color?: string;         // optional override
};

const SRC_ID = 'ripple-heatline-src';
const LYR_ID = 'ripple-heatline-layer';

export function addRippleHeatlineLayer(map: mapboxgl.Map | null, edges: RippleEdge[]) {
  if (!map) return () => {};

  // Build GeoJSON + normalize color
  const fc: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: (edges ?? []).map(e => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[e.from.lng, e.from.lat], [e.to.lng, e.to.lat]] },
      properties: {
        w: Math.max(0.05, Math.min(1, e.weight ?? 0)),
        color: e.color ?? 'rgba(236,72,153,0.8)', // pink default
      },
    })),
  };

  const upsert = () => {
    if (!map || !map.isStyleLoaded?.()) return;

    const json = JSON.stringify(fc);
    const src = map.getSource(SRC_ID) as (mapboxgl.GeoJSONSource & { _prevJSON?: string }) | undefined;

    if (src) {
      if (src._prevJSON !== json) {
        src.setData(fc as any);
        (src as any)._prevJSON = json;
      }
    } else {
      map.addSource(SRC_ID, { type: 'geojson', data: fc as any });
      (map.getSource(SRC_ID) as any)._prevJSON = json;
    }

    if (!map.getLayer(LYR_ID)) {
      map.addLayer({
        id: LYR_ID,
        type: 'line',
        source: SRC_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['get', 'w'], 0, 2, 1, 6],
          'line-opacity': 0.9,
          'line-blur': 0.5,
        },
      });
    }
  };

  const onStyle = () => upsert();

  if (map.isStyleLoaded?.()) upsert();
  else map.once('style.load', onStyle);

  map.on('style.load', onStyle);

  return () => {
    try { map.off('style.load', onStyle); } catch {}
    try { if (map.getLayer(LYR_ID)) map.removeLayer(LYR_ID); } catch {}
    try { if (map.getSource(SRC_ID)) map.removeSource(SRC_ID); } catch {}
  };
}