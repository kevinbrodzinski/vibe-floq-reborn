import type mapboxgl from 'mapbox-gl';

// Bootstrap map event handlers for style reload protection  
// Note: UserAuraOverlay now handles its own style reload resilience
export function setupMapEventHandlers(_map: mapboxgl.Map) {
  // No-op: custom layer rebuilds are handled by individual overlay components
}

// Call this in map cleanup
export function cleanupMapEventHandlers(_map: mapboxgl.Map) {
  // No-op: individual overlay components handle their own cleanup
}