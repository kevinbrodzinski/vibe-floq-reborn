import type mapboxgl from 'mapbox-gl';
import { rebuildUserAura } from '@/lib/map/layers/userAura';

// Bootstrap map event handlers for style reload protection
export function setupMapEventHandlers(map: mapboxgl.Map) {
  // Rebuild custom layers after style changes
  const onStyleData = () => {
    if (map.isStyleLoaded()) {
      rebuildUserAura(map);
      // Add other custom layer rebuilds here as needed
    }
  };

  map.on('styledata', onStyleData);
  
  // Store cleanup function
  (map as any)._cleanupEventHandlers = () => {
    map.off('styledata', onStyleData);
  };
}

// Call this in map cleanup
export function cleanupMapEventHandlers(map: mapboxgl.Map) {
  const cleanup = (map as any)._cleanupEventHandlers;
  if (cleanup) cleanup();
}