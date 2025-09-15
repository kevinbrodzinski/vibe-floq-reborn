import { useEffect } from 'react';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { layerManager } from '@/lib/map/LayerManager';
import { createClusterOverlay } from '@/lib/map/overlays/clusterOverlay';

type Props = {
  data: GeoJSON.FeatureCollection; // features with properties: { venueId, name, category }
  enabled?: boolean;
  beforeId?: string;
};

export function VenuesClusterOverlay({ data, enabled = true, beforeId }: Props) {
  const map = getCurrentMap();

  useEffect(() => {
    if (!map || !enabled) return;
    
    const spec = createClusterOverlay({
      id: 'venues',
      kind: 'venues',
      color: '#22c55e',
      clusterColor: '#14532d',
      textColor: '#ecfdf5',
      beforeId,
      sourceData: data,
      idProp: 'venueId',
      titleProp: 'name',
      hexProp: 'vibeHex', // if you have a vibe tint for venues, else omit
    });
    
    layerManager.register(spec);
    layerManager.apply('venues', data);

    const reapply = () => { if (map.isStyleLoaded()) spec.mount(map); };
    map.on('styledata', reapply);
    map.on('load', reapply);

    return () => {
      map.off('styledata', reapply);
      map.off('load', reapply);
      layerManager.unregister('venues');
    };
  }, [map, data, enabled, beforeId]);

  // Update data when it changes
  useEffect(() => {
    if (map && enabled) {
      layerManager.apply('venues', data);
    }
  }, [map, data, enabled]);

  return null;
}