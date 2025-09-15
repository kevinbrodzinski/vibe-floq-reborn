/* eslint-disable @typescript-eslint/no-explicit-any */
import type mapboxgl from 'mapbox-gl';
import type { OverlaySpec } from '@/lib/map/LayerManager';
import type { PressureCell } from '@/lib/api/mapContracts';
import { applyLayerColors } from '@/lib/map/applyLayerColors';
import { onThemeChange } from '@/lib/map/themeColor';

const SRC = 'social-weather-src';
const LYR = 'social-weather-layer';

export function createSocialWeatherSpec(beforeId?: string): OverlaySpec {
  let offTheme: (() => void) | null = null;

  return {
    id: 'social-weather',
    beforeId,
    mount(map) {
      if (!map.getSource(SRC)) {
        map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } as any });
      }
      if (!map.getLayer(LYR)) {
        // 1) Add layer with hard, valid defaults (no CSS vars)
        const layer: mapboxgl.CircleLayer = {
          id: LYR,
          type: 'circle',
          source: SRC,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'pressure'], 0.0, 2, 0.5, 6, 1.0, 10],
            'circle-color': '#22c55e',          // fallback boot color
            'circle-opacity': ['interpolate', ['linear'], ['get', 'pressure'], 0.0, 0.1, 1.0, 0.4],
            'circle-stroke-color': '#22c55e',   // fallback boot color
            'circle-stroke-opacity': 0.25,
            'circle-stroke-width': 1,
          }
        };
        beforeId && map.getLayer(beforeId) ? map.addLayer(layer, beforeId) : map.addLayer(layer);

        // 2) Immediately resolve CSS vars -> real colors and apply
        const applyColors = () => {
          applyLayerColors(map, LYR, {
            'circle-color': { var: '--accent', fallback: 'hsl(142 76% 36%)' },
            'circle-stroke-color': { var: '--accent', fallback: 'hsl(142 76% 36%)' },
          });
        };
        applyColors();

        // 3) Keep colors in sync when theme changes
        offTheme = onThemeChange(applyColors);

        // 4) Re-apply after style reloads
        const reapply = () => {
          if (!map.isStyleLoaded()) { map.once('idle', reapply); return; }
          if (!map.getLayer(LYR)) return;
          applyColors();
        };
        map.on('styledata', reapply);
        map.on('load', reapply);
      }
    },
    update(map, fc) {
      const src = map.getSource(SRC) as mapboxgl.GeoJSONSource;
      src?.setData(fc as any);
    },
    unmount(map) {
      try { offTheme?.(); } catch {}
      try { if (map.getLayer(LYR)) map.removeLayer(LYR); } catch {}
      try { if (map.getSource(SRC)) map.removeSource(SRC); } catch {}
    }
  };
}

// Helper to build FC from pressure cells
export function socialWeatherToFC(cells: PressureCell[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: (cells ?? []).map(c => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: c.center },
      properties: {
        key: c.key,
        pressure: c.pressure,
        temperature: c.temperature,
        humidity: c.humidity,
      }
    }))
  };
}