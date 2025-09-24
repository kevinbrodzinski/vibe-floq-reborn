import { useEffect } from 'react';
import { layerManager } from '@/lib/map/LayerManager';
import type mapboxgl from 'mapbox-gl';

/**
 * Centralized LayerManager binding hook
 * Call this once per map instance, typically in your main map component
 * Returns the layerManager instance for use in components
 */
export function useLayerManager(map: mapboxgl.Map | null) {
  useEffect(() => {
    if (!map) return;
    
    layerManager.bindMap(map);
    return () => layerManager.unbind();
  }, [map]);
  
  return layerManager;
}