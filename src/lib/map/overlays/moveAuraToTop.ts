import type mapboxgl from 'mapbox-gl';

/**
 * Utility to ensure aura layers stay on top of all other layers
 */
export function moveAuraToTop(map: mapboxgl.Map) {
  if (!map || !map.isStyleLoaded()) return;
  
  try {
    const auraLayerIds = ['user-aura-outer', 'user-aura-inner', 'user-aura-dot'];
    const layers = map.getStyle()?.layers ?? [];
    const topId = layers[layers.length - 1]?.id;
    
    if (topId) {
      auraLayerIds.forEach(id => {
        if (map.getLayer(id)) {
          try { 
            map.moveLayer(id, topId); 
          } catch (e) {
            // Silent failure - layer might not exist or already at top
          }
        }
      });
    }
  } catch (e) {
    // Silent failure for production stability
  }
}