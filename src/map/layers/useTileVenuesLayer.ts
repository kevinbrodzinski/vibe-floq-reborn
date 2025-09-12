import * as React from 'react';
import type { FeatureCollection } from 'geojson';
import type mapboxgl from 'mapbox-gl';
import type { TileVenue } from '@/lib/api/mapContracts';
import { brand } from '@/lib/tokens/brand';
import { LayerManager } from '@/lib/map/LayerManager';
import { hashJSON } from '@/lib/map/hash';

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

/** Create idempotent update function for LayerManager */
function venuesUpdateFn(venues: TileVenue[]) {
  const fc = venues?.length ? toGeoJSON(venues) : { type: 'FeatureCollection', features: [] } as FeatureCollection;
  const hash = hashJSON(fc);

  const update = (map: mapboxgl.Map) => {
    // source
    if (!map.getSource(SRC_ID)) {
      map.addSource(SRC_ID, { type: 'geojson', data: fc as any });
    } else {
      (map.getSource(SRC_ID) as mapboxgl.GeoJSONSource).setData(fc as any);
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

  const unmount = (map: mapboxgl.Map) => {
    try { if (map.getLayer(LYR_ID)) map.removeLayer(LYR_ID); } catch {}
    try { if (map.getSource(SRC_ID)) map.removeSource(SRC_ID); } catch {}
  };

  return { hash, update, unmount };
}

export function useTileVenuesLayer(map: mapboxgl.Map | null, venues?: TileVenue[]) {
  const managerRef = React.useRef<LayerManager | null>(null);

  // Initialize LayerManager
  React.useEffect(() => {
    if (map && !managerRef.current) {
      managerRef.current = new LayerManager(map);
    }
    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }
    };
  }, [map]);

  // Apply venues layer through LayerManager
  React.useEffect(() => {
    if (!map || !managerRef.current) return;

    const { hash, update, unmount } = venuesUpdateFn(venues ?? []);
    managerRef.current.upsert('tile-venues', hash, update, { order: 30, unmount });

    return () => {
      if (managerRef.current) {
        managerRef.current.remove('tile-venues');
      }
    };
  }, [map, venues]);
}