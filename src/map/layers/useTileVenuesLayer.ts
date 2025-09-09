import { useEffect, useMemo } from 'react';
import type { TileVenue } from '@/lib/api/mapContracts';
import { brand } from '@/lib/tokens/brand';

const SRC_ID = 'floq:venues';
const LYR_ID = 'floq:venues:circles';

// Convert venues → GeoJSON
function toGeoJSON(venues: TileVenue[]) {
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
  } as const;
}

export function useTileVenuesLayer(map: any, venues?: TileVenue[]) {
  const data = useMemo(() => (venues?.length ? toGeoJSON(venues) : { type: 'FeatureCollection', features: [] }), [venues]);

  useEffect(() => {
    if (!map) return;

    // Create or update source
    if (!map.getSource(SRC_ID)) {
      map.addSource(SRC_ID, { type: 'geojson', data });
    } else {
      const s: any = map.getSource(SRC_ID);
      s?.setData?.(data);
    }

    // Create layer if missing
    if (!map.getLayer(LYR_ID)) {
      map.addLayer({
        id: LYR_ID,
        type: 'circle',
        source: SRC_ID,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            10, ['case', ['has', 'busy'], ['+', 3, ['*', 2, ['get', 'busy']]], 3],
            16, ['case', ['has', 'busy'], ['+', 6, ['*', 3, ['get', 'busy']]], 6],
          ],
          'circle-color': brand.primary,
          'circle-opacity': 0.9,
          'circle-stroke-color': brand.primaryDark,
          'circle-stroke-width': 1,
        }
      });
    }

    return () => {
      // Don't remove source/layer on unmount if map persists
    };
  }, [map, data]);
}