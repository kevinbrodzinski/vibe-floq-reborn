import { useEffect } from 'react';
import { layerManager } from '@/lib/map/LayerManager';
import { createConvergenceSpec } from '@/lib/map/overlays/convergenceSpec';
import type mapboxgl from 'mapbox-gl';

type ConvergencePoint = {
  lng: number;
  lat: number;
  prob: number;
  etaMin?: number;
  groupMin?: number;
};

function convPointsToFC(points: ConvergencePoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: (points ?? []).map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { 
        prob: p.prob, 
        eta: p.etaMin ?? 0, 
        group: p.groupMin ?? 0 
      },
    })),
  };
}

export function useConvergenceOverlay(map: mapboxgl.Map | null, points: ConvergencePoint[] | undefined) {
  // Register spec once when map is available
  useEffect(() => {
    if (!map) return;
    layerManager.register(createConvergenceSpec());
    return () => layerManager.unregister('convergence');
  }, [map]);

  // Apply data when points change
  useEffect(() => {
    if (!points) return;
    layerManager.apply('convergence', convPointsToFC(points));
  }, [points]);
}