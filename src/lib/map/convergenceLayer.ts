import type mapboxgl from 'mapbox-gl';

const SRC_ID = 'convergence-src';
const LYR_ID = 'convergence-circles';

export function addConvergenceLayer(
  map: mapboxgl.Map | null,
  fc: GeoJSON.FeatureCollection,          // {Point} features with props: prob, eta, group
  beforeId?: string                       // optional insert position
) {
  if (!map) return () => {};

  const upsert = () => {
    if (!map || !map.isStyleLoaded?.()) return;

    const json = JSON.stringify(fc ?? { type: 'FeatureCollection', features: [] });
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
      const layer: mapboxgl.CircleLayer = {
        id: LYR_ID,
        type: 'circle',
        source: SRC_ID,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'prob'],
            0.2, 8,
            0.6, 12,
            0.9, 16
          ],
          'circle-color': [
            'interpolate', ['linear'], ['get', 'prob'],
            0.2, 'rgba(147,197,253,0.6)',   // light blue
            0.6, 'rgba(99,102,241,0.7)',    // indigo
            0.9, 'rgba(236,72,153,0.8)'     // pink
          ],
          'circle-blur': 0.4,
          'circle-stroke-color': 'rgba(255,255,255,0.9)',
          'circle-stroke-width': ['interpolate', ['linear'], ['get', 'prob'], 0.2, 1, 0.9, 2],
          'circle-opacity': ['interpolate', ['linear'], ['get', 'prob'], 0.2, 0.7, 0.9, 0.9],
        },
      };

      if (beforeId && map.getLayer(beforeId)) {
        map.addLayer(layer, beforeId);
      } else {
        map.addLayer(layer);
      }
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