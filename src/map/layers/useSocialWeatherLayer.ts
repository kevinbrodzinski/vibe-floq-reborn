import { useEffect, useMemo } from 'react';
import type { PressureCell } from '@/lib/api/mapContracts';
import { brand } from '@/lib/tokens/brand';

const SRC_ID = 'floq:social-weather';
const LYR_ID = 'floq:social-weather:circles';

function toGeoJSON(cells: PressureCell[]) {
  return {
    type: 'FeatureCollection',
    features: cells.map(c => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: c.center },
      properties: {
        key: c.key,
        pressure: c.pressure,
        temperature: c.temperature,
        humidity: c.humidity,
      },
    })),
  } as const;
}

export function useSocialWeatherLayer(map: any, cells?: PressureCell[]) {
  const data = useMemo(() => (cells?.length ? toGeoJSON(cells) : { type: 'FeatureCollection', features: [] }), [cells]);

  useEffect(() => {
    if (!map) return;

    if (!map.getSource(SRC_ID)) {
      map.addSource(SRC_ID, { type: 'geojson', data });
    } else {
      const s: any = map.getSource(SRC_ID);
      s?.setData?.(data);
    }

    if (!map.getLayer(LYR_ID)) {
      map.addLayer({
        id: LYR_ID,
        type: 'circle',
        source: SRC_ID,
        paint: {
          // Pressure drives alpha + size (privacy-safe)
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'pressure'],
            0.0, 2,
            0.5, 6,
            1.0, 10
          ],
          'circle-color': brand.accent,
          'circle-opacity': [
            'interpolate', ['linear'], ['get', 'pressure'],
            0.0, 0.10,
            1.0, 0.40
          ],
          'circle-stroke-color': brand.accent,
          'circle-stroke-opacity': 0.25,
          'circle-stroke-width': 1,
        }
      });
    }
  }, [map, data]);
}