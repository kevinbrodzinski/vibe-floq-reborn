import { useEffect } from 'react';
import { layerManager } from '@/lib/map/LayerManager';
import { createFriendFlowsSpec, friendFlowsToFC } from '@/lib/map/overlays/friendFlowsSpec';
import type { FriendFlowRow } from '@/lib/map/overlays/friendFlowsSpec';
import type mapboxgl from 'mapbox-gl';

export function useFriendFlowsOverlay(map: mapboxgl.Map | null, rows: FriendFlowRow[] | undefined) {
  // Register spec once when map is available
  useEffect(() => {
    if (!map) return;
    layerManager.register(createFriendFlowsSpec());
    return () => layerManager.unregister('friend-flows');
  }, [map]);

  // Apply data when rows change
  useEffect(() => {
    if (!rows) return;
    layerManager.apply('friend-flows', friendFlowsToFC(rows));
  }, [rows]);
}