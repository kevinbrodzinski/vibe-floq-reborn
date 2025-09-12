import * as React from 'react';
import type { TileVenue } from '@/lib/api/mapContracts';
import { layerManager } from '@/lib/map/LayerManager';
import { createTileVenuesSpec, tileVenuesToFC } from '@/lib/map/overlays/tileVenuesSpec';

export function useTileVenuesLayer(map: any, venues?: TileVenue[]) {
  // Register the tile venues spec once
  React.useEffect(() => {
    if (!map) return;
    layerManager.bindMap(map);
    layerManager.register(createTileVenuesSpec());
    
    return () => layerManager.unbind();
  }, [map]);

  // Apply venues data whenever it changes
  React.useEffect(() => {
    if (!venues) return;
    const fc = tileVenuesToFC(venues);
    layerManager.apply('tile-venues', fc);
  }, [venues]);
}