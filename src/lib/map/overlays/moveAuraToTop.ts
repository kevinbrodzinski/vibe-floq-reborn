import type mapboxgl from 'mapbox-gl';

/**
 * Utility to ensure aura layers stay on top of all other layers
 * Enhanced with better guards and race condition handling
 */
export function moveAuraToTop(map: mapboxgl.Map) {
  if (!map || !map.isStyleLoaded()) return;
  
  try {
    const auraLayerIds = ['user-aura-outer', 'user-aura-inner', 'user-aura-dot'];
    const layers = map.getStyle()?.layers ?? [];
    const topId = layers[layers.length - 1]?.id;
    
    if (!topId) return; // No layers exist yet
    
    // Wait a frame to ensure all layers are fully mounted
    requestAnimationFrame(() => {
      if (!map.isStyleLoaded()) return;
      
      auraLayerIds.forEach(id => {
        // Double-check each layer exists before attempting to move
        if (map.getLayer(id)) {
          try { 
            map.moveLayer(id, topId); 
          } catch (e) {
            // Silent failure - layer might not exist or already at top
            if (process.env.NODE_ENV !== 'production') {
              console.debug(`[moveAuraToTop] Failed to move ${id}:`, e);
            }
          }
        }
      });
    });
  } catch (e) {
    // Silent failure for production stability
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[moveAuraToTop] Function failed:', e);
    }
  }
}