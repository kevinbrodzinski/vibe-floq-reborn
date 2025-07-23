import React, { useMemo, useState } from 'react';
import { BaseMap } from '../../../../packages/ui/src/maps';
import { useClusters } from '@/hooks/useClusters';
import { useFieldViewport } from '@/hooks/useFieldViewport';
import { VibeDensityEmpty } from '@/components/map/VibeDensityEmpty';
import { VibeDensityBackground } from '@/components/map/VibeDensityBackground';
import { ClusterLegend } from '@/components/map/ClusterLegend';
import DeckGL from '@deck.gl/react';
import { createDensityLayer } from '@/components/map/DeckLayers';
import { useVibeFilter } from '@/hooks/useVibeFilter';
import mapboxgl from 'mapbox-gl';
import type { Cluster } from '@/hooks/useClusters';

export const VibeDensityMap: React.FC = () => {
  const { bounds, onRegionChange } = useFieldViewport();
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [vibeFilterState, vibeFilterHelpers] = useVibeFilter();
  
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

  const { clusters, loading, error, isRealTimeConnected } = useClusters(bbox, 6);

  // Filter clusters based on active vibes
  const filteredClusters = useMemo(() => {
    if (!vibeFilterHelpers.activeSet) return clusters;
    
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
    console.log('Selected cluster:', cluster);
  };

  // Create deck.gl layers
  const layers = useMemo(() => {
    const activeVibes = vibeFilterHelpers.activeSet ? 
      Array.from(vibeFilterHelpers.activeSet) : [];
    
    const densityLayer = createDensityLayer(
      filteredClusters,
      Object.fromEntries(
        activeVibes.map(vibe => [vibe, 1])
      ),
      handleClusterClick
    );
    
    return densityLayer ? [densityLayer] : [];
  }, [filteredClusters, vibeFilterHelpers.activeSet]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base Map with unified token management */}
      <BaseMap onRegionChange={onRegionChange}>
        {/* Background visualization - always visible */}
        <VibeDensityBackground />
        
        {/* Deck.GL Layer */}
        <DeckGL
          layers={layers}
          getTooltip={({ object }) => 
            object && {
              html: `
                <div class="bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
                  <div class="font-semibold">${object.total} people</div>
                  <div class="text-sm text-muted-foreground">
                    ${Object.entries(object.vibe_counts || {})
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .slice(0, 3)
                      .map(([vibe, count]) => `${vibe}: ${count}`)
                      .join(', ')}
                  </div>
                </div>
              `,
              style: { pointerEvents: 'none' }
            }
          }
        />
        
        {/* Empty/Loading States */}
        <VibeDensityEmpty 
          isLoading={loading}
          error={error}
          clustersCount={filteredClusters.length}
        />
        
        {/* Debug Info Overlay */}
        {import.meta.env.DEV && (
          <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3 text-xs font-mono">
            <div>Layers: {layers.length}</div>
            <div>Clusters: {filteredClusters.length}</div>
            <div>Real-time: {isRealTimeConnected ? 'ON' : 'OFF'}</div>
            <div>Loading: {loading ? 'YES' : 'NO'}</div>
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
      </BaseMap>
    </div>
  );
};
