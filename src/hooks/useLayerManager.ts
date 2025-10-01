import { useEffect, useRef, useMemo, useDebugValue } from 'react';
import type mapboxgl from 'mapbox-gl';
import { layerManager as singleton, type LayerManagerFacade } from '@/lib/map/LayerManager';

/**
 * Centralized LayerManager binding hook
 * - Idempotent binds: avoids double-binding to the same Map instance
 * - Clean unbinds when Map instance changes or component unmounts
 * - Exposes a minimal, typed facade (register/apply/unregister/has/registerOrReplace)
 */
export function useLayerManager(map: mapboxgl.Map | null): LayerManagerFacade | null {
  const boundMapRef = useRef<mapboxgl.Map | null>(null);

  useDebugValue(map ? 'bound' : 'unbound');

  // Bind/unbind lifecycle
  useEffect(() => {
    if (!map) return;

    // Avoid double-binding to the same instance
    if (boundMapRef.current === map) return;

    // If we were bound to a different map, unbind first
    if (boundMapRef.current && boundMapRef.current !== map) {
      try {
        singleton.unbind();
      } catch {}
      boundMapRef.current = null;
    }

    // Bind to the new map instance
    singleton.bindMap(map);
    boundMapRef.current = map;

    return () => {
      // Only unbind if we're still bound to this instance
      if (boundMapRef.current === map) {
        try {
          singleton.unbind();
        } finally {
          boundMapRef.current = null;
        }
      }
    };
  }, [map]);

  // Minimal facade so callers don't reach into the singleton internals
  const manager = useMemo((): LayerManagerFacade | null => {
    if (!map) return null;
    
    return {
      register: singleton.register.bind(singleton),
      unregister: singleton.unregister.bind(singleton),
      apply: singleton.apply.bind(singleton),
      has: singleton.has.bind(singleton),
      registerOrReplace: singleton.registerOrReplace.bind(singleton),
      onApply: singleton.onApply.bind(singleton),
      getStats: singleton.getStats.bind(singleton),
      setLowPower: singleton.setLowPower.bind(singleton),
    };
  }, [map]);

  return manager;
}