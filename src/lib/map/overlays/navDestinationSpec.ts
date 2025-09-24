/* eslint-disable @typescript-eslint/no-explicit-any */
import type mapboxgl from 'mapbox-gl';
import { layerManager, type OverlaySpec } from '@/lib/map/LayerManager';

const SRC = 'floq:nav:dest';
const DOT = 'floq:nav:dest:dot';
const HALO = 'floq:nav:dest:halo';

export function createNavDestinationSpec(): OverlaySpec {
  return {
    id: 'nav-destination',
    mount(map: mapboxgl.Map) {
      if (!map.getSource(SRC)) {
        map.addSource(SRC, { type: 'geojson', data: emptyFC() as any });
      }
      if (!map.getLayer(HALO)) {
        map.addLayer({
          id: HALO,
          type: 'circle',
          source: SRC,
          paint: {
            'circle-radius': ['+', ['coalesce', ['get', 'r'], 8], 6],
            'circle-color': '#ec4899', // pink-500
            'circle-opacity': ['*', ['coalesce', ['get', 'a'], 0.0], 0.6],
            'circle-blur': 0.9,
          },
        });
      }
      if (!map.getLayer(DOT)) {
        map.addLayer({
          id: DOT,
          type: 'circle',
          source: SRC,
          paint: {
            'circle-radius': ['coalesce', ['get', 'r'], 8],
            'circle-color': '#ec4899',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
            'circle-opacity': ['coalesce', ['get', 'a'], 0.0],
          },
        });
      }
    },
    update(map: mapboxgl.Map, fc: GeoJSON.FeatureCollection) {
      const src = map.getSource(SRC) as mapboxgl.GeoJSONSource | undefined;
      if (src) src.setData(fc as any);
    },
    unmount(map: mapboxgl.Map) {
      try { if (map.getLayer(DOT)) map.removeLayer(DOT); } catch {}
      try { if (map.getLayer(HALO)) map.removeLayer(HALO); } catch {}
      try { if (map.getSource(SRC)) map.removeSource(SRC); } catch {}
    },
  };
}

export function destFC(lng: number, lat: number, r = 8, a = 1): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: { r, a },
    }],
  };
}

export function emptyFC(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

/** One-shot pulse: grows radius / fades opacity, then clears. */
export function flashNavDestination(lng: number, lat: number, duration = 1400) {
  const start = performance.now();
  let raf = 0;

  const tick = (t: number) => {
    const p = Math.min(1, (t - start) / duration);
    const ease = 1 - Math.pow(1 - p, 2); // easeOutQuad
    const r = 8 + 18 * ease;             // 8px → 26px
    const a = 0.9 * (1 - ease);          // 0.9 → 0

    layerManager.apply('nav-destination', destFC(lng, lat, r, a));
    if (p < 1) raf = requestAnimationFrame(tick);
    else setTimeout(() => layerManager.apply('nav-destination', emptyFC()), 120);
  };

  // kick
  layerManager.apply('nav-destination', destFC(lng, lat, 8, 0.9));
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}