/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OverlaySpec } from '@/lib/map/LayerManager';

const SRC = 'breadcrumb-src';
const LINE_LYR = 'breadcrumb-line';
const VENUES_LYR = 'breadcrumb-venues';

export function createBreadcrumbSpec(beforeId?: string): OverlaySpec {
  return {
    id: 'breadcrumb',
    beforeId,
    mount(map) {
      if (!map.getSource(SRC)) {
        map.addSource(SRC, { 
          type: 'geojson', 
          data: { type: 'FeatureCollection', features: [] } as any 
        });
      }

      // Add dotted line layer for path
      if (!map.getLayer(LINE_LYR)) {
        const lineLayer: mapboxgl.LineLayer = {
          id: LINE_LYR,
          type: 'line',
          source: SRC,
          filter: ['==', ['get', 'type'], 'path'],
          paint: {
            'line-color': 'hsl(var(--primary))',
            'line-width': 3,
            'line-opacity': 0.7,
            'line-dasharray': [2, 2]
          },
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          }
        };
        beforeId && map.getLayer(beforeId) ? map.addLayer(lineLayer, beforeId) : map.addLayer(lineLayer);
      }

      // Add venue markers layer
      if (!map.getLayer(VENUES_LYR)) {
        const venuesLayer: mapboxgl.CircleLayer = {
          id: VENUES_LYR,
          type: 'circle',
          source: SRC,
          filter: ['==', ['get', 'type'], 'venue'],
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              12, 6,
              16, 10
            ],
            'circle-color': 'hsl(var(--primary))',
            'circle-stroke-color': 'hsl(var(--background))',
            'circle-stroke-width': 2,
            'circle-opacity': 0.9
          }
        };
        beforeId && map.getLayer(beforeId) ? map.addLayer(venuesLayer, beforeId) : map.addLayer(venuesLayer);
      }
    },
    update(map, fc) {
      const src = map.getSource(SRC) as mapboxgl.GeoJSONSource;
      src?.setData(fc as any);
    },
    unmount(map) {
      try { if (map.getLayer(VENUES_LYR)) map.removeLayer(VENUES_LYR); } catch {}
      try { if (map.getLayer(LINE_LYR)) map.removeLayer(LINE_LYR); } catch {}
      try { if (map.getSource(SRC)) map.removeSource(SRC); } catch {}
    }
  };
}