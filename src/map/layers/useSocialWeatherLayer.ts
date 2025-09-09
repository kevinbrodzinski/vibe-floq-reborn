import { useEffect, useMemo } from 'react';
import type { PressureCell } from '@/lib/api/mapContracts';
import { brand } from '@/lib/tokens/brand';
import { ensureGeoJSONSource, ensureLayer, persistOnStyle, findFirstSymbolLayerId } from '@/lib/map/stylePersistence';

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
  const data = useMemo(
    () => (cells?.length ? toGeoJSON(cells) : ({ type: 'FeatureCollection', features: [] } as const)),
    [cells]
  );

  useEffect(() => {
    if (!map) return;

    const readd = () => {
      ensureGeoJSONSource(map, SRC_ID, data as any);

      const beforeId = findFirstSymbolLayerId(map);
      ensureLayer(
        map,
        {
          id: LYR_ID,
          type: 'circle',
          source: SRC_ID,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'pressure'], 0.0, 2, 0.5, 6, 1.0, 10],
            'circle-color': brand.accent,
            'circle-opacity': ['interpolate', ['linear'], ['get', 'pressure'], 0.0, 0.1, 1.0, 0.4],
            'circle-stroke-color': brand.accent,
            'circle-stroke-opacity': 0.25,
            'circle-stroke-width': 1,
          },
        },
        beforeId
      );
    };

    const cleanup = persistOnStyle(map, readd);

    const src: any = map.getSource(SRC_ID);
    if (src?.setData) src.setData(data as any);

    return cleanup;
  }, [map, data]);
}