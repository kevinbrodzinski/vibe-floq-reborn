import * as React from 'react';
import type { FeatureCollection } from 'geojson';
import type mapboxgl from 'mapbox-gl';
import type { TileVenue } from '@/lib/api/mapContracts';
import { brand } from '@/lib/tokens/brand';

const SRC_ID = 'tile-venues-src';
const LYR_ID = 'tile-venues-layer';

function toGeoJSON(venues: TileVenue[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: venues.map(v => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
      properties: {
        pid: v.pid,
        name: v.name,
        open_now: v.open_now ?? null,
        busy: v.busy_band ?? null,
        score: v.score ?? 0,
      },
    })),
  };
}

export function useTileVenuesLayer(map: mapboxgl.Map | null, venues?: TileVenue[]) {
  // tiny dedupe snapshot so we don't setData repeatedly
  const lastJsonRef = React.useRef<string>('');

  React.useEffect(() => {
    if (!map) return;

    const fc = venues?.length ? toGeoJSON(venues) : { type: 'FeatureCollection', features: [] } as FeatureCollection;

    const upsert = () => {
      // guard: style is required for all add/get calls
      if (!map || !map.isStyleLoaded?.()) return;

      // dedupe: skip if unchanged
      const json = JSON.stringify(fc);
      if (json === lastJsonRef.current) return;
      lastJsonRef.current = json;

      // source
      const src = map.getSource(SRC_ID) as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData(fc as any);
      } else {
        map.addSource(SRC_ID, { type: 'geojson', data: fc as any });
      }

      // layer
      if (!map.getLayer(LYR_ID)) {
        map.addLayer({
          id: LYR_ID,
          type: 'circle',
          source: SRC_ID,
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
        });
      }
    };

    // run now or when style loads / reloads
    const onStyle = () => upsert();

    if (map.isStyleLoaded?.()) {
      upsert();
    } else {
      map.once('style.load', onStyle);
    }

    // keep it resilient across style changes (e.g., basemap switch)
    map.on('style.load', onStyle);

    return () => {
      try { map.off('style.load', onStyle); } catch {}
      try { if (map.getLayer(LYR_ID)) map.removeLayer(LYR_ID); } catch {}
      try { if (map.getSource(SRC_ID)) map.removeSource(SRC_ID); } catch {}
    };
  }, [map, venues]);
}