import * as React from 'react';
import mapboxgl from 'mapbox-gl';
import { getCurrentMap } from '@/lib/geo/mapSingleton';

/**
 * Listens for:
 *  - ui:map:flyTo   { lng, lat, zoom? }
 *  - ui:nav:dest    { lng, lat, duration? } -> temporary pulse marker
 */
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

    // simple pulse marker (DOM) that self-removes
    const onDest = (e: Event) => {
      const d = (e as CustomEvent<{ lng: number; lat: number; duration?: number }>).detail;
      if (!d || !map) return;
      const { lng, lat, duration = 1600 } = d;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

      const el = document.createElement('div');
      el.style.width = '18px';
      el.style.height = '18px';
      el.style.borderRadius = '9999px';
      el.style.background = 'rgba(236, 72, 153, 0.85)'; // pink-500-ish
      el.style.boxShadow = '0 0 0 0 rgba(236, 72, 153, 0.35)';
      el.style.transition = 'box-shadow 500ms ease';
      el.setAttribute('aria-hidden', 'true');

      // animate "pulse" once
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map);

      requestAnimationFrame(() => {
        el.style.boxShadow = '0 0 0 16px rgba(236, 72, 153, 0)';
      });

      window.setTimeout(() => {
        try { marker.remove(); } catch {}
      }, duration);
    };

    window.addEventListener('ui:map:flyTo', onFlyTo as EventListener);
    window.addEventListener('ui:nav:dest', onDest as EventListener);

    return () => {
      window.removeEventListener('ui:map:flyTo', onFlyTo as EventListener);
      window.removeEventListener('ui:nav:dest', onDest as EventListener);
    };
  }, []);

  return null;
}