
import React, { useMemo, useState, useEffect } from 'react';
import { VibeDensityWebMap } from '@/components/maps/VibeDensityWebMap';
import { useClusters } from '@/hooks/useClusters';
import { useFieldViewport } from '@/hooks/useFieldViewport';
import { VibeDensityEmpty } from '@/components/map/VibeDensityEmpty';
import { VibeDensityBackground } from '@/components/map/VibeDensityBackground';
import { ClusterLegend } from '@/components/map/ClusterLegend';
import DeckGL from '@deck.gl/react';
import { createDensityLayer } from '@/components/map/DeckLayers';
import { useVibeFilter } from '@/hooks/useVibeFilter';
import { renderClusterTooltip } from './tooltipHelpers';
import type { MapViewState } from '@deck.gl/core';
import type { Cluster } from '@/hooks/useClusters';

type VibeWeights = Record<string, number>;

export const VibeDensityMap: React.FC = () => {
  console.log('[VibeDensityMap] Component mounted and rendering');
  
  const { bounds, onRegionChange } = useFieldViewport();
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [vibeFilterState, vibeFilterHelpers] = useVibeFilter();
  
  // Add effect to log when component mounts/unmounts
  useEffect(() => {
    console.log('[VibeDensityMap] Component mounted');
    return () => {
      console.log('[VibeDensityMap] Component unmounted');
    };
  }, []);
  
  // Convert bounds to bbox format for clusters hook
  const bbox = useMemo(() => {
    if (!bounds) return [-118.5, 33.9, -118.0, 34.1] as [number, number, number, number];
    return [
      bounds.minLng,
      bounds.minLat, 
      bounds.maxLng,
      bounds.maxLat
    ] as [number, number, number, number];
  }, [bounds]);

  const { clusters, loading, error, realtime } = useClusters(bbox, 6);

  // Filter clusters based on active vibes - now using stable activeSet
  const filteredClusters = useMemo(() => {
    if (!vibeFilterHelpers.activeSet || vibeFilterHelpers.activeSet.size === 0) return clusters;
    
    return clusters.filter(cluster => {
      if (!cluster.vibe_counts) return false;
      
      // Check if cluster has any of the active vibes
      return Object.keys(cluster.vibe_counts).some(vibe => 
        vibeFilterHelpers.activeSet.has(vibe as any)
      );
    });
  }, [clusters, vibeFilterHelpers.activeSet]);

  const handleClusterClick = (cluster: Cluster) => {
    setSelectedCluster(cluster);
    if (import.meta.env.DEV) {
      console.log('Selected cluster:', cluster);
    }
  };

  // Create deck.gl layers - now using stable activeSet
  const layers = useMemo<any[]>(() => {
    const activeVibes = vibeFilterHelpers.activeSet ? 
      Array.from(vibeFilterHelpers.activeSet) : [];
    
    const weights: VibeWeights = Object.fromEntries(
      activeVibes.map(vibe => [vibe, 1])
    );
    
    const densityLayer = createDensityLayer(
      filteredClusters,
      weights,
      handleClusterClick
    );
    
    return densityLayer ? [densityLayer] : [];
  }, [filteredClusters, vibeFilterHelpers.activeSet]);

  const initialViewState: Partial<MapViewState> = {
    latitude: 34.05,
    longitude: -118.24,
    zoom: 11
  };

  console.log('[VibeDensityMap] Rendering map component');

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Vibe Density Map with edge function token */}
      <VibeDensityWebMap
        visible={true}
        onRegionChange={onRegionChange}
      >
        {/* Background visualization - always visible */}
        <VibeDensityBackground />
        
        {/* Deck.GL Layer - only render if we have layers to avoid empty canvas covering map */}
        {layers.length > 0 && (
          <DeckGL
            initialViewState={initialViewState}
            layers={layers}
            getTooltip={({ object }) => 
              object && {
                html: renderClusterTooltip(object),
                style: { pointerEvents: 'none' }
              }
            }
          />
        )}
        
        {/* Empty/Loading States */}
        <VibeDensityEmpty 
          isLoading={loading}
          error={error}
          clustersCount={filteredClusters.length}
        />
        
        {/* Simplified Debug Info Overlay - only shows critical info */}
        {import.meta.env.DEV && (
          <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3 text-xs font-mono">
            <div>Clusters: {filteredClusters.length}/{clusters.length}</div>
            <div>Real-time: {realtime ? 'ON' : 'OFF'}</div>
            {loading && <div>Loading...</div>}
            {error && <div className="text-destructive">Error: {error}</div>}
          </div>
        )}
        
        {/* Legend */}
        {filteredClusters.length > 0 && (
          <ClusterLegend 
            clusters={filteredClusters}
            className="absolute bottom-4 right-4"
          />
        )}
      </VibeDensityWebMap>
    </div>
  );
};
