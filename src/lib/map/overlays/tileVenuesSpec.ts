/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OverlaySpec } from '@/lib/map/LayerManager';
import type { TileVenue } from '@/lib/api/mapContracts';
import { applyLayerColors } from '@/lib/map/applyLayerColors';
import { onThemeChange } from '@/lib/map/themeColor';

const SRC = 'tile-venues-src';
const LYR = 'tile-venues-layer';

/**
 * Data shape expected by update():
 * FeatureCollection of Points with properties:
 *  - pid: string
 *  - name: string
 *  - open_now?: boolean
 *  - busy?: number (0-4)
 *  - score?: number
 */
export function createTileVenuesSpec(beforeId?: string): OverlaySpec {
  let offTheme: (() => void) | null = null;

  return {
    id: 'tile-venues',
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
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              10, 3,
              16, 6
            ],
            'circle-color': '#22d3ee',          // fallback boot color
            'circle-opacity': 0.9,
            'circle-stroke-color': '#ffffff',   // fallback boot color
            'circle-stroke-width': 1
          }
        };
        beforeId && map.getLayer(beforeId) ? map.addLayer(layer, beforeId) : map.addLayer(layer);

        // 2) Immediately resolve CSS vars -> real colors and apply
        const applyColors = () => {
          applyLayerColors(map, LYR, {
            'circle-color': { var: '--primary', fallback: 'hsl(190 95% 55%)' },
            'circle-stroke-color': { var: '--primary-foreground', fallback: 'hsl(0 0% 100%)' },
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

// Helper to build FC from your venues
export function tileVenuesToFC(venues: TileVenue[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: (venues ?? []).map(v => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
      properties: { 
        pid: v.pid,
        name: v.name,
        open_now: v.open_now ?? null,
        busy: v.busy_band ?? null,
        score: v.score ?? 0,
      }
    }))
  };
}