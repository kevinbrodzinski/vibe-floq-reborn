/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OverlaySpec } from '@/lib/map/LayerManager';
import type { Map } from 'mapbox-gl';
import { hslVar, onThemeChange } from '@/lib/map/themeColor';

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

      // Resolve colors at mount time
      const lineColor = hslVar('--primary', 'hsl(210 100% 50%)');
      const circleColor = hslVar('--primary', 'hsl(210 100% 50%)');
      const strokeColor = hslVar('--background', 'hsl(0 0% 100%)');

      // Add dotted line layer for path
      if (!map.getLayer(LINE_LYR)) {
        const lineLayer: mapboxgl.LineLayer = {
          id: LINE_LYR,
          type: 'line',
          source: SRC,
          filter: ['==', ['get', 'type'], 'path'],
          paint: {
            'line-color': lineColor,
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
            'circle-color': circleColor,
            'circle-stroke-color': strokeColor,
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

/**
 * Re-apply colors if theme changes (Tailwind dark mode, data-theme, etc.)
 */
export function installBreadcrumbThemeWatcher(map: Map, ids = {
  circle: VENUES_LYR,
  line: LINE_LYR,
}) {
  const apply = () => {
    const lineColor = hslVar('--primary', 'hsl(210 100% 50%)');
    const circleColor = hslVar('--primary', 'hsl(210 100% 50%)');
    const strokeColor = hslVar('--background', 'hsl(0 0% 100%)');

    if (map.getLayer(ids.line)) {
      map.setPaintProperty(ids.line, 'line-color', lineColor);
    }
    if (map.getLayer(ids.circle)) {
      map.setPaintProperty(ids.circle, 'circle-color', circleColor);
      map.setPaintProperty(ids.circle, 'circle-stroke-color', strokeColor);
    }
  };

  // Apply immediately and subscribe to theme changes
  apply();
  return onThemeChange(apply);
}