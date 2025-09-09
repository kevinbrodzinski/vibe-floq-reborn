// src/map/layers/useForecastLayer.ts
import { useEffect, useMemo } from 'react';
import type { FeatureCollection, Feature, Point } from 'geojson';
import type { PressureCell } from '@/lib/api/mapContracts';
import { ensureGeoJSONSource, ensureLayer, persistOnStyle, findFirstSymbolLayerId } from '@/lib/map/stylePersistence';
import { getVibeToken } from '@/lib/tokens/vibeTokens';

const SRC_ID = 'floq:social-forecast';
const LYR_ID = 'floq:social-forecast:circles';

function toFC(cells: PressureCell[]): FeatureCollection {
  const features: Feature<Point, any>[] = cells.map(c => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: c.center },
    properties: { pressure: c.pressure, temperature: c.temperature, humidity: c.humidity },
  }));
  return { type: 'FeatureCollection', features };
}

export function useForecastLayer(map: any, cells?: PressureCell[]) {
  const data = useMemo(() => toFC(cells ?? []), [cells]);

  useEffect(() => {
    if (!map) return;

    const readd = () => {
      if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) return;
      const t = getVibeToken('focus' as any); // or current vibe

      ensureGeoJSONSource(map, SRC_ID, data as any);
      const before = findFirstSymbolLayerId(map);

      ensureLayer(map, {
        id: LYR_ID, type: 'circle', source: SRC_ID,
        paint: {
          'circle-radius': ['interpolate',['linear'],['get','pressure'], 0.0, 2, 0.5, 6, 1.0, 10],
          'circle-color': t.base,
          'circle-opacity': 0.35,          // slightly subtler than "now"
          'circle-stroke-color': t.ring,
          'circle-stroke-width': 1,
        }
      }, before);

      // Debug telemetry
      console.debug('[floq] readded forecast layer', { src: SRC_ID, lyr: LYR_ID, t: Date.now() });
    };

    const cleanup = persistOnStyle(map, readd);
    const src: any = map.getSource(SRC_ID);
    if (src?.setData) src.setData(data as any);
    return cleanup;
  }, [map, data]);
}