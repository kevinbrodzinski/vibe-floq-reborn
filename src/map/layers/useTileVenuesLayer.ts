import { useEffect, useMemo } from 'react';
import type { FeatureCollection } from 'geojson';
import type { TileVenue } from '@/lib/api/mapContracts';
import { brand } from '@/lib/tokens/brand';
import { ensureGeoJSONSource, ensureLayer, persistOnStyle, findFirstSymbolLayerId } from '@/lib/map/stylePersistence';

const SRC_ID = 'floq:venues';
const LYR_ID = 'floq:venues:circles';

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

export function useTileVenuesLayer(map: any, venues?: TileVenue[]) {
  const data = useMemo(() => {
    if (!venues?.length) return { type: 'FeatureCollection', features: [] } as FeatureCollection;
    return toGeoJSON(venues);
  }, [venues]);

  useEffect(() => {
    if (!map) return;

    const readd = () => {
      // skip until style is fully ready
      if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) return;

      // 1) (Re)create source and set latest data
      ensureGeoJSONSource(map, SRC_ID, data);

      // 2) (Re)create layer
      const beforeId = findFirstSymbolLayerId(map); // optional anchor
      ensureLayer(
        map,
        {
          id: LYR_ID,
          type: 'circle',
          source: SRC_ID,
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10,
              ['case', ['has', 'busy'], ['+', 3, ['*', 2, ['get', 'busy']]], 3],
              16,
              ['case', ['has', 'busy'], ['+', 6, ['*', 3, ['get', 'busy']]], 6],
            ],
            'circle-color': brand.primary,
            'circle-opacity': 0.9,
            'circle-stroke-color': brand.primaryDark,
            'circle-stroke-width': 1,
          },
        },
        beforeId
      );

      // Debug telemetry
      console.debug('[floq] readded venues layer', { src: SRC_ID, lyr: LYR_ID, t: Date.now() });
    };

    // Persist layer across style changes
    const cleanup = persistOnStyle(map, readd);

    // Also update data on every venues change (without waiting for style events)
    const src: any = map.getSource(SRC_ID);
    if (src?.setData) src.setData(data);

    return cleanup;
  }, [map, data]);
}