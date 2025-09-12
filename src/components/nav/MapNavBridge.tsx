import * as React from 'react';
import type mapboxgl from 'mapbox-gl';
import { getCurrentMap } from '@/lib/geo/mapSingleton';

export function MapNavBridge() {
  React.useEffect(() => {
    const map: mapboxgl.Map | null = getCurrentMap();
    const onFlyTo = (e: Event) => {
      const d = (e as CustomEvent<{ lng: number; lat: number; zoom?: number }>).detail;
      if (!d || !map?.flyTo) return;
      const { lng, lat, zoom = 15 } = d;
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        map.flyTo({ center: [lng, lat], zoom, essential: true });
      }
    };

    window.addEventListener('ui:map:flyTo', onFlyTo as EventListener);
    return () => window.removeEventListener('ui:map:flyTo', onFlyTo as EventListener);
  }, []);

  return null;
}