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
      // Check if map is still valid before removing
      if (mapSingleton.current && typeof mapSingleton.current.remove === 'function') {
        mapSingleton.current.remove();
      }
    } catch (error) {
      // This is expected during hot reloads - don't spam console
      console.debug('[mapSingleton] Expected cleanup error during hot reload:', error.message);
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
      if (mapSingleton.current && typeof mapSingleton.current.remove === 'function') {
        mapSingleton.current.remove();
      }
    } catch (error) {
      console.debug('[mapSingleton] Expected cleanup error:', error.message);
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