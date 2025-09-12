import * as React from 'react';
import mapboxgl from 'mapbox-gl';
import { getCurrentMap } from '@/lib/geo/mapSingleton';

// SSR-safe Mapbox loader
function getMapboxGL() {
  try { 
    return typeof window !== 'undefined' ? mapboxgl : null;
  } catch { 
    return null; 
  }
}

/**
 * Listens for:
 *  - ui:map:flyTo   { lng, lat, zoom? }
 *  - ui:nav:dest    { lng, lat, duration? } -> draws a one-shot pink pulse marker
 */
export function MapNavBridge() {
  const glRef = React.useRef<typeof mapboxgl | null>(null);

  React.useEffect(() => {
    glRef.current = getMapboxGL();
    const map: mapboxgl.Map | null = getCurrentMap();
    if (!map) return; // no map yet; early out (safe)

    const onFlyTo = (e: Event) => {
      const d = (e as CustomEvent<{ lng: number; lat: number; zoom?: number }>).detail;
      if (!d || !map?.flyTo) return;
      const { lng, lat, zoom = 15 } = d;
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        // avoid stutter if the map is still loading
        if (typeof map.isStyleLoaded === 'function' && !map.isStyleLoaded()) {
          map.once('style.load', () => map.flyTo({ center: [lng, lat], zoom, essential: true }));
          return;
        }
        map.flyTo({ center: [lng, lat], zoom, essential: true });
      }
    };

    const onDest = (e: Event) => {
      const d = (e as CustomEvent<{ lng: number; lat: number; duration?: number }>).detail;
      const gl = glRef.current;
      if (!d || !map || !gl) return;
      const { lng, lat, duration = 1600 } = d;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

      const el = document.createElement('div');
      el.style.width = '18px';
      el.style.height = '18px';
      el.style.borderRadius = '9999px';
      el.style.background = 'rgba(236, 72, 153, 0.85)'; // pink-ish
      el.style.boxShadow = '0 0 0 0 rgba(236, 72, 153, 0.35)';
      el.style.transition = 'box-shadow 500ms ease';
      el.setAttribute('aria-hidden', 'true');

      // if another pulse exists, remove it before adding a new one (prevents piling)
      (MapNavBridge as any)._lastMarker?.remove?.();

      const marker = new gl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map);

      (MapNavBridge as any)._lastMarker = marker;

      requestAnimationFrame(() => {
        el.style.boxShadow = '0 0 0 16px rgba(236, 72, 153, 0)';
      });

      window.setTimeout(() => {
        try { marker.remove(); } catch {}
        if ((MapNavBridge as any)._lastMarker === marker) {
          (MapNavBridge as any)._lastMarker = null;
        }
      }, duration);
    };

    window.addEventListener('ui:map:flyTo', onFlyTo as EventListener);
    window.addEventListener('ui:nav:dest', onDest as EventListener);

    return () => {
      window.removeEventListener('ui:map:flyTo', onFlyTo as EventListener);
      window.removeEventListener('ui:nav:dest', onDest as EventListener);
      try { (MapNavBridge as any)._lastMarker?.remove?.(); } catch {}
      (MapNavBridge as any)._lastMarker = null;
    };
  }, []);

  return null;
}