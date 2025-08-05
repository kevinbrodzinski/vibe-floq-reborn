/**
 * Map Singleton Manager - Prevents WebGL context leaks
 * Ensures only one map instance exists at a time across hot reloads
 */

import mapboxgl from 'mapbox-gl';

// Use window global to survive hot reloads
const getGlobalMapRef = () => {
  if (typeof window === 'undefined') return { current: null };
  
  if (!(window as any).__FLOQ_MAP_SINGLETON) {
    (window as any).__FLOQ_MAP_SINGLETON = { current: null };
  }
  
  return (window as any).__FLOQ_MAP_SINGLETON;
};

export const mapSingleton = getGlobalMapRef();

/**
 * Safe map creation that prevents WebGL context leaks
 */
export function createMapSafely(container: HTMLDivElement, options: Omit<mapboxgl.MapboxOptions, 'container'>): mapboxgl.Map {
  // Clean up any existing map first
  if (mapSingleton.current) {
    console.log('[mapSingleton] Cleaning up previous map instance');
    try {
      mapSingleton.current.remove();
    } catch (error) {
      console.warn('[mapSingleton] Error cleaning up previous map:', error);
    }
    mapSingleton.current = null;
  }
  
  // Create new map
  console.log('[mapSingleton] Creating new map instance');
  const map = new mapboxgl.Map({
    container,
    ...options
  });
  
  // Store in singleton
  mapSingleton.current = map;
  
  return map;
}

/**
 * Clean up the singleton map
 */
export function cleanupMapSingleton() {
  if (mapSingleton.current) {
    console.log('[mapSingleton] Cleaning up singleton map');
    try {
      mapSingleton.current.remove();
    } catch (error) {
      console.warn('[mapSingleton] Error cleaning up singleton:', error);
    }
    mapSingleton.current = null;
  }
}

/**
 * Get the current map instance if it exists
 */
export function getCurrentMap(): mapboxgl.Map | null {
  return mapSingleton.current;
}