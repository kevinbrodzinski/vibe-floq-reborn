/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OverlaySpec } from '@/lib/map/LayerManager';
import type { TileVenue } from '@/lib/api/mapContracts';
import { brand } from '@/lib/tokens/brand';

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
  return {
    id: 'tile-venues',
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
              'interpolate', ['linear'], ['zoom'],
              10, 3,
              16, 6
            ],
            'circle-color': brand.primary,
            'circle-opacity': 0.9,
            'circle-stroke-color': brand.primaryDark,
            'circle-stroke-width': 1
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