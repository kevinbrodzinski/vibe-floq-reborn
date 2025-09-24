import React, { useEffect } from 'react';
import { useConvergenceDetection } from '@/hooks/useConvergenceDetection';
import { layerManager } from '@/lib/map/LayerManager';
import { createConvergenceSpec } from '@/lib/map/overlays/convergenceSpec';
import type mapboxgl from 'mapbox-gl';

interface ConvergenceMapOverlayProps {
  map: mapboxgl.Map | null;
  venues?: Array<{
    id: string;
    position: [number, number];
    type: string;
    popularity: number;
    name: string;
  }>;
}

export const ConvergenceMapOverlay: React.FC<ConvergenceMapOverlayProps> = ({ 
  map, 
  venues = [] 
}) => {
  const { activeConvergences } = useConvergenceDetection(venues);

  // Register convergence layer
  useEffect(() => {
    if (!map) return;
    
    layerManager.register(createConvergenceSpec());
    return () => layerManager.unregister('convergence');
  }, [map]);

  // Update convergence points
  useEffect(() => {
    if (!activeConvergences.length) {
      layerManager.apply('convergence', {
        type: 'FeatureCollection',
        features: []
      });
      return;
    }

    const features = activeConvergences.map(convergence => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: convergence.convergencePoint
      },
      properties: {
        prob: convergence.probability,
        eta: convergence.timeToMeet,
        group: convergence.agentIds.length,
        venue: convergence.nearestVenue?.name || null
      }
    }));

    layerManager.apply('convergence', {
      type: 'FeatureCollection',
      features
    });
  }, [activeConvergences]);

  return null;
};