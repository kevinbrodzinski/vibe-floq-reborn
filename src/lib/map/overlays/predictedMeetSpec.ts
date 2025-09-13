/* eslint-disable @typescript-eslint/no-explicit-any */
import type mapboxgl from 'mapbox-gl';
import type { OverlaySpec } from '@/lib/map/LayerManager';

const SRC_ID = 'floq:predicted-meet';
const LYR_DOT = 'floq:predicted-meet:dot';
const LYR_RING = 'floq:predicted-meet:ring';

export function createPredictedMeetSpec(): OverlaySpec {
  return {
    id: 'predicted-meet',
    mount(map: mapboxgl.Map) {
      if (!map.getSource(SRC_ID)) {
        map.addSource(SRC_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } as any });
      }

      // Static dot (anchor)
      if (!map.getLayer(LYR_DOT)) {
        const dot: mapboxgl.CircleLayer = {
          id: LYR_DOT,
          type: 'circle',
          source: SRC_ID,
          filter: ['==', ['get', 'kind'], 'dot'],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 8],
            'circle-color': 'rgba(236,72,153,0.85)', // pink
            'circle-opacity': 0.9,
            'circle-stroke-color': 'rgba(255,255,255,0.95)',
            'circle-stroke-width': 1.5,
            'circle-blur': 0.25,
          },
        };
        map.addLayer(dot);
      }

      // Pulsing ring (animated stroke)
      if (!map.getLayer(LYR_RING)) {
        const ring: mapboxgl.CircleLayer = {
          id: LYR_RING,
          type: 'circle',
          source: SRC_ID,
          filter: ['==', ['get', 'kind'], 'ring'],
          paint: {
            // We write ring radius (in px) into feature props `r`
            'circle-radius': ['get', 'r'],
            'circle-color': 'rgba(0,0,0,0)',      // transparent fill
            'circle-stroke-color': 'rgba(236,72,153,1)',
            // opacity fades with `o` we compute per-frame
            'circle-stroke-opacity': ['get', 'o'],
            'circle-stroke-width': 2,
            'circle-blur': 0.8,
          },
        };
        // draw ring beneath the dot (so dot sits atop)
        map.addLayer(ring, LYR_DOT);
      }
    },
    update(map: mapboxgl.Map, data: any) {
      const src = map.getSource(SRC_ID) as mapboxgl.GeoJSONSource;
      if (src?.setData) src.setData(data);
    },
    unmount(map: mapboxgl.Map) {
      try { if (map.getLayer(LYR_RING)) map.removeLayer(LYR_RING); } catch {}
      try { if (map.getLayer(LYR_DOT)) map.removeLayer(LYR_DOT); } catch {}
      try { if (map.getSource(SRC_ID)) map.removeSource(SRC_ID); } catch {}
    },
  };
}

export function applyPredictedMeetFeatureCollection(fc: any, map?: mapboxgl.Map) {
  const src = map?.getSource(SRC_ID) as mapboxgl.GeoJSONSource | undefined;
  if (src?.setData) src.setData(fc);
}