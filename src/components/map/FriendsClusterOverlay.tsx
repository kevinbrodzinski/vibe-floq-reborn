import { useEffect } from 'react';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { layerManager } from '@/lib/map/LayerManager';
import { createClusterOverlay } from '@/lib/map/overlays/clusterOverlay';

type Props = {
  data: GeoJSON.FeatureCollection; // features with properties: { friendId, name, vibeHex }
  enabled?: boolean;
  beforeId?: string;
};

export function FriendsClusterOverlay({ data, enabled = true, beforeId }: Props) {
  const map = getCurrentMap();

  useEffect(() => {
    if (!map || !enabled) return;
    
    const spec = createClusterOverlay({
      id: 'friends',
      kind: 'friends',
      color: '#60a5fa',           // fallback point color
      clusterColor: '#1f2937',    // cluster bubble
      textColor: '#ffffff',
      beforeId,
      sourceData: data,
      idProp: 'friendId',
      titleProp: 'name',
      hexProp: 'vibeHex',
    });
    
    layerManager.register(spec);
    layerManager.apply('friends', data);

    const reapply = () => { if (map.isStyleLoaded()) spec.mount(map); };
    map.on('styledata', reapply);
    map.on('load', reapply);

    return () => {
      map.off('styledata', reapply);
      map.off('load', reapply);
      layerManager.unregister('friends');
    };
  }, [map, data, enabled, beforeId]);

  // Update data when it changes
  useEffect(() => {
    if (map && enabled) {
      layerManager.apply('friends', data);
    }
  }, [map, data, enabled]);

  return null;
}