/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OverlaySpec } from '@/lib/map/LayerManager';
import type mapboxgl from 'mapbox-gl';
import { hslVar, onThemeChange } from '@/lib/map/themeColor';
import { applyLayerColors, applyLayerColorsWhenReady } from '@/lib/map/applyLayerColors';

const SRC = 'breadcrumb-src';
const LINE_LYR = 'breadcrumb-line';
const VENUES_LYR = 'breadcrumb-venues';

/** Resolve a safe 'before' layer id if the requested one doesn't exist */
function resolveBefore(map: mapboxgl.Map, requested?: string): string | undefined {
  // If requested exists, use it
  if (requested && map.getLayer(requested)) return requested;
  // Prefer inserting beneath labels if possible
  const preferred = ['poi-label', 'road-label', 'place-label', 'poi'];
  for (const id of preferred) if (map.getLayer(id)) return id;
  // Else, find the topmost symbol layer as anchor
  const layers = map.getStyle()?.layers ?? [];
  for (let i = layers.length - 1; i >= 0; i--) {
    if (layers[i].type === 'symbol') return layers[i].id;
  }
  // Fallback: undefined (adds to top)
  return undefined;
}

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

      const safeBefore = resolveBefore(map, beforeId);

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
        map.addLayer(lineLayer, safeBefore);
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
        map.addLayer(venuesLayer, resolveBefore(map, safeBefore ?? LINE_LYR));
      }

      // Move breadcrumb layers on top for visibility
      try {
        const allIds = [LINE_LYR, VENUES_LYR].filter(id => map.getLayer(id));
        const layers = map.getStyle()?.layers ?? [];
        const topId = layers[layers.length - 1]?.id;
        if (topId) allIds.forEach(id => { try { map.moveLayer(id, topId); } catch {} });
      } catch {}
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
export function installBreadcrumbThemeWatcher(
  map: mapboxgl.Map,
  ids = { circle: VENUES_LYR, line: LINE_LYR }
) {
  const IDS = [ids.line, ids.circle];
  const spec = {
    [ids.line]: {
      paint: {
        'line-color': hslVar('--primary', 'hsl(210 100% 50%)'),
      }
    },
    [ids.circle]: {
      paint: {
        'circle-color': hslVar('--primary', 'hsl(210 100% 50%)'),
        'circle-stroke-color': hslVar('--background', 'hsl(0 0% 100%)'),
      }
    }
  };
  
  const apply = () => {
    // Use the style-safe version that waits for layers to exist
    applyLayerColorsWhenReady(map, spec, IDS);
  };

  // Apply immediately and subscribe to theme changes
  apply();
  return onThemeChange(apply);
}