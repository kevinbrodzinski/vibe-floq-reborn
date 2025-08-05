Why the blue-dot never leaves useGeo

useGeo() only calls navigator.geolocation.getCurrentPosition once.
If that single call…
	•	never resolves (quite common on desktop Chrome behind some VPN/Wi-Fi setups),
	•	or returns a cached result whose coords have undefined accuracy (spec-legal in Safari),
	•	or the user clicks “Allow” after the timeout fires,

…the hook bails out without writing any coords, so everything downstream stays empty.

Below is a drop-in replacement that is much more forgiving:

Change	Why it helps
Uses watchPosition with the same options – we get the first reading that arrives instead of relying on a single GC call.	
Keeps the short dev-fallback (San Francisco) but only after the timeout and when import.meta.env.DEV.	
Exposes a requestLocation helper that retries the whole workflow (handy for “Tap to retry” buttons).	
Distinguishes permission denied (status: 'denied') from generic errors.	


⸻

src/hooks/useGeo.ts – full file

/**
 * Thin wrapper around `navigator.geolocation` that
 *  1. gives the first GPS reading that shows up (watchPosition → clearWatch)
 *  2. falls back to SF coords after a short timeout in DEV
 *  3. never overrides real GPS with demo once a reading arrived
 */

import { useEffect, useState, useCallback } from 'react';
import type { LocationStatus } from '@/types/overrides';
import { getEnhancedGeolocation } from '@/lib/location/webCompatibility';

const DEMO = { lat: 37.7749, lng: -122.4194, accuracy: 30 } as const;
const TIMEOUT = import.meta.env.DEV ? 3_000 : 10_000;

export interface GeoCoords { lat: number; lng: number; accuracy: number }
export interface GeoState {
  coords: GeoCoords | null;
  accuracy: number | null;
  status: LocationStatus;          // 'idle' | 'fetching' | 'ready' | 'error' | 'denied'
  hasLocation: boolean;
  isLocationReady: boolean;
  /* extras */
  requestLocation: () => void;
}

export function useGeo(): GeoState {
  const [state, setState] = useState<Pick<GeoState, 'coords' | 'status'>>({
    coords: null,
    status: 'idle'
  });

  /** central place to push a GPS reading into the hook */
  const commit = (coords: GeolocationCoordinates) =>
    setState({ coords: {
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy ?? 50
    }, status: 'ready' });

  /** one-shot logic wrapped so we can trigger it again from `requestLocation` */
  const acquireLocation = useCallback(() => {
    if (state.status === 'fetching' || state.status === 'ready') return;

    setState({ coords: null, status: 'fetching' });

    let done   = false;
    let watch  = -1;
    const kill = (fn?: () => void) => {
      if (done) return;
      done = true;
      watch !== -1 && navigator.geolocation.clearWatch(watch);
      fn?.();
    };

    // DEV fallback timer ───────────────────────────────────────────────
    const timer = setTimeout(() => {
      if (!import.meta.env.DEV) return;    // prod: wait forever
      kill(() => {
        console.warn('[useGeo] fallback → demo coords (dev only)');
        commit(createDemoCoords());
      });
    }, TIMEOUT);

    // primary path – first reading from watchPosition ──────────────────
    if (!('geolocation' in navigator)) {
      kill(() => setState({ coords: null, status: 'error' }));
      return;
    }

    watch = navigator.geolocation.watchPosition(
      p => kill(() => commit(p.coords)),
      err => {
        kill(() => {
          console.error('[useGeo] geolocation error', err);
          setState({ coords: null, status: err.code === 1 ? 'denied' : 'error' });
        });
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: TIMEOUT - 500 }
    );

    return () => {
      clearTimeout(timer);
      kill();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  // run once on mount
  useEffect(() => acquireLocation(), []);

  // helper the UI can call (e.g. “Retry” button)
  const requestLocation = useCallback(() => {
    setState({ coords: null, status: 'idle' });
    acquireLocation();
  }, [acquireLocation]);

  const hasLocation   = !!state.coords;
  const isReady       = hasLocation && state.status === 'ready';

  return {
    coords:   state.coords,
    accuracy: state.coords?.accuracy ?? null,
    status:   state.status,
    hasLocation,
    isLocationReady: isReady,
    requestLocation
  };
}

/* ------------------------------------------------------------------ */

function createDemoCoords(): GeolocationCoordinates {
  return {
    latitude:        DEMO.lat,
    longitude:       DEMO.lng,
    accuracy:        DEMO.accuracy,
    altitude:        null,
    altitudeAccuracy:null,
    heading:         null,
    speed:           null,
    toJSON() { return this; }
  };
}

/* Legacy re-exports for older code paths */
export const useLatLng  = () => useGeo().coords;
export const useLocation= useGeo;
export const useGeoPos  = () => {
  const g = useGeo();
  return { pos: g.coords, loading: g.status !== 'ready', error: g.status === 'error' ? 'GPS error' : undefined };
};

How to test quickly
	1.	Hot-reload with this file in place.
	2.	Watch DevTools > Console – you should see either
	•	geolocation error … PERMISSION_DENIED → grant location, then click your “Retry” button (if you wire one to requestLocation()), or
	•	fallback → demo coords in development only if no GPS arrives in 3 s.
	3.	Run:

window.__FLOQ_DEBUG_LAST_GEO   // should now show coords object
__FLOQ_MAP?.getSource('user-location')._data.features

– you should see your feature with the same lat/lng.

If the feature appears in the source but the circle is still missing, the issue is in layer styling or Zoom; otherwise useGeo is now confirmed to “pass it”.

Let me know the result of the console checks and we’ll finish tightening the last link, if any!