/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OverlaySpec } from '@/lib/map/LayerManager';

const SRC = 'conv-src';
const LYR = 'conv-layer';

export function createConvergenceSpec(beforeId?: string): OverlaySpec {
  return {
    id: 'convergence',
    beforeId,
    mount(map) {
      if (!map.getSource(SRC)) {
        map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } as any });
      }
      if (!map.getLayer(LYR)) {
        const layer: mapboxgl.CircleLayer = {
          id: LYR, 
          type: 'circle', 
          source: SRC,
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['get', 'prob'], 
              0.2, 8, 
              0.6, 12, 
              0.9, 16
            ],
            'circle-color': [
              'interpolate', ['linear'], ['get', 'prob'],
              0.2, 'rgba(147,197,253,0.6)', 
              0.6, 'rgba(99,102,241,0.7)', 
              0.9, 'rgba(236,72,153,0.8)'
            ],
            'circle-blur': 0.4,
            'circle-stroke-color': 'rgba(255,255,255,0.9)',
            'circle-stroke-width': ['interpolate', ['linear'], ['get', 'prob'], 0.2, 1, 0.9, 2],
            'circle-opacity': ['interpolate', ['linear'], ['get', 'prob'], 0.2, 0.7, 0.9, 0.9],
          }
        };
        beforeId && map.getLayer(beforeId) ? map.addLayer(layer, beforeId) : map.addLayer(layer);
      }
    },
    update(map, fc) {
      const src = map.getSource(SRC) as mapboxgl.GeoJSONSource;
      src?.setData(fc as any);
    },
    unmount(map) {
      try { if (map.getLayer(LYR)) map.removeLayer(LYR); } catch {}
      try { if (map.getSource(SRC)) map.removeSource(SRC); } catch {}
    }
  };
}