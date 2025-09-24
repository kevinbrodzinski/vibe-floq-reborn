/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OverlaySpec } from '@/lib/map/LayerManager';

const SRC = 'heatline-src';
const LYR = 'heatline-layer';

/**
 * Data format expected: FeatureCollection of LineStrings with properties { w: 0..1, color: string }
 */
export function createRippleHeatlineSpec(beforeId?: string): OverlaySpec {
  return {
    id: 'ripple-heatline',
    beforeId,
    mount(map) {
      if (!map.getSource(SRC)) {
        map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } as any });
      }
      if (!map.getLayer(LYR)) {
        const layer: mapboxgl.LineLayer = {
          id: LYR, 
          type: 'line', 
          source: SRC,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['coalesce', ['get', 'color'], 'rgba(236,72,153,0.85)'], // pink default
            'line-width': ['interpolate', ['linear'], ['get', 'w'], 0, 2, 1, 6],
            'line-opacity': 0.9, 
            'line-blur': 0.5
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