import mapboxgl from 'mapbox-gl';

let currentMap: mapboxgl.Map | null = null;

export function setCurrentMap(map: mapboxgl.Map | null) {
  currentMap = map;
}

export function getCurrentMap(): mapboxgl.Map | null {
  return currentMap;
}

// Create map with singleton protection
export function createMapSafely(container: HTMLElement, options: any): mapboxgl.Map {
  // Clean up existing map if any
  if (currentMap) {
    try {
      currentMap.remove();
    } catch (e) {
      console.warn('Error cleaning up existing map:', e);
    }
    currentMap = null;
  }

  // Create new map
  const map = new mapboxgl.Map({
    container,
    ...options
  });

  // Store reference
  currentMap = map;
  return map;
}

// Cleanup singleton map
export function cleanupMapSingleton() {
  if (currentMap) {
    try {
      currentMap.remove();
    } catch (e) {
      console.warn('Error cleaning up map singleton:', e);
    }
    currentMap = null;
  }
}