import { useEffect } from 'react';
import { layerManager } from '@/lib/map/LayerManager';
import { createRippleHeatlineSpec } from '@/lib/map/overlays/rippleHeatlineSpec';
import type mapboxgl from 'mapbox-gl';

type HeatEdge = {
  from: { lng: number; lat: number };
  to: { lng: number; lat: number };
  weight: number;
  color?: string;
};

function heatEdgesToFC(edges: HeatEdge[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: (edges ?? []).map(e => ({
      type: 'Feature',
      geometry: { 
        type: 'LineString', 
        coordinates: [[e.from.lng, e.from.lat], [e.to.lng, e.to.lat]] 
      },
      properties: { 
        w: Math.max(0.05, Math.min(1, e.weight ?? 0)), 
        color: e.color ?? 'rgba(236,72,153,0.8)' 
      },
    })),
  };
}

export function useRippleHeatlineOverlay(map: mapboxgl.Map | null, edges: HeatEdge[] | undefined) {
  // Register spec once when map is available
  useEffect(() => {
    if (!map) return;
    layerManager.register(createRippleHeatlineSpec());
    return () => layerManager.unregister('ripple-heatline');
  }, [map]);

  // Apply data when edges change
  useEffect(() => {
    if (!edges) return;
    layerManager.apply('ripple-heatline', heatEdgesToFC(edges));
  }, [edges]);
}