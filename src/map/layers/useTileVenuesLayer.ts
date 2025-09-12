import * as React from 'react';
import type { TileVenue } from '@/lib/api/mapContracts';
import { layerManager } from '@/lib/map/LayerManager';
import { createTileVenuesSpec, tileVenuesToFC } from '@/lib/map/overlays/tileVenuesSpec';

export function useTileVenuesLayer(map: any, venues?: TileVenue[]) {
  // Register the tile venues spec once when map is available
  React.useEffect(() => {
    if (!map) return;
    layerManager.register(createTileVenuesSpec());
    return () => layerManager.unregister('tile-venues');
  }, [map]);

  // Apply venues data whenever it changes
  React.useEffect(() => {
    if (!venues) return;
    const fc = tileVenuesToFC(venues);
    layerManager.apply('tile-venues', fc);
  }, [venues]);
}