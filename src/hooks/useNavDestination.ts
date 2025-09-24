import * as React from 'react';
import type mapboxgl from 'mapbox-gl';
import { layerManager } from '@/lib/map/LayerManager';
import { createNavDestinationSpec, flashNavDestination } from '@/lib/map/overlays/navDestinationSpec';

export function useNavDestination(map: mapboxgl.Map | null) {
  React.useEffect(() => {
    if (!map) return;
    layerManager.register(createNavDestinationSpec());

    const onDest = (e: Event) => {
      const d = (e as CustomEvent).detail ?? {};
      if (typeof d?.lng === 'number' && typeof d?.lat === 'number') {
        flashNavDestination(d.lng, d.lat, d.duration ?? 1400);
      }
    };

    window.addEventListener('ui:nav:dest', onDest as EventListener);
    return () => {
      window.removeEventListener('ui:nav:dest', onDest as EventListener);
      layerManager.unregister('nav-destination');
    };
  }, [map]);
}