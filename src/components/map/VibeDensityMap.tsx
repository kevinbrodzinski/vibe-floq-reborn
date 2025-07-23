import React, { useMemo, useState, useEffect } from 'react';
import DeckGL           from '@deck.gl/react';
import type { MapViewState } from '@deck.gl/core';

import { VibeDensityWebMap }      from '@/components/maps/VibeDensityWebMap';
import { useClusters }            from '@/hooks/useClusters';
import { useFieldViewport }       from '@/hooks/useFieldViewport';
import { useVibeFilter }          from '@/hooks/useVibeFilter';
import { createDensityLayer }     from '@/components/map/DeckLayers';
import { renderClusterTooltip }   from './tooltipHelpers';
import { VibeDensityEmpty }       from '@/components/map/VibeDensityEmpty';
import { VibeDensityBackground }  from '@/components/map/VibeDensityBackground';
import { ClusterLegend }          from '@/components/map/ClusterLegend';

import type { Cluster }           from '@/hooks/useClusters';

type VibeWeights = Record<string, number>;

export const VibeDensityMap: React.FC = () => {
  const { bounds, onRegionChange } = useFieldViewport();
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [vibeFilterState, vibeFilterHelpers] = useVibeFilter();

  /* bbox for the hook --------------------------------------------- */
  const bbox = useMemo<[number, number, number, number]>(() => {
    if (!bounds) return [-118.5, 33.9, -118.0, 34.1];
    return [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat];
  }, [bounds]);

  const {
    clusters,
    loading,
    error,
    realtime,          // ← renamed from isRealTimeConnected
  } = useClusters(bbox, 6);

  /* --------------------------------------------------------------- */
  const filteredClusters = useMemo(() => {
    const set = vibeFilterHelpers.activeSet;
    if (!set || set.size === 0) return clusters;
    return clusters.filter(c =>
      Object.keys(c.vibe_counts ?? {}).some(v => set.has(v as any)),
    );
  }, [clusters, vibeFilterHelpers.activeSet]);

  const handleClusterClick = (cluster: Cluster) => setSelectedCluster(cluster);

  const layers = useMemo(() => {
    if (filteredClusters.length === 0) return [];
    const weights: VibeWeights = Object.fromEntries(
      [...(vibeFilterHelpers.activeSet ?? [])].map(v => [v, 1]),
    );
    const layer = createDensityLayer(filteredClusters, weights, handleClusterClick);
    return layer ? [layer] : [];
  }, [filteredClusters, vibeFilterHelpers.activeSet]);

  const initialViewState: Partial<MapViewState> = {
    latitude : 34.05,
    longitude: -118.24,
    zoom     : 11,
  };

  /* --------------------------------------------------------------- */
  return (
    <div className="absolute inset-0 overflow-hidden">
      <VibeDensityWebMap onRegionChange={onRegionChange}>
        <VibeDensityBackground />

        {layers.length > 0 && (
          <DeckGL
            initialViewState={initialViewState}
            layers={layers}
            getTooltip={({ object }) =>
              object && {
                html : renderClusterTooltip(object),
                style: { pointerEvents: 'none' },
              }
            }
          />
        )}

        <VibeDensityEmpty
          isLoading={loading}
          error={error}
          clustersCount={filteredClusters.length}
        />

        {import.meta.env.DEV && (
          <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3 text-xs font-mono">
            <div>Clusters: {filteredClusters.length}/{clusters.length}</div>
            <div>Real-time: {realtime ? 'ON' : 'OFF'}</div>
            {loading && <div>Loading…</div>}
            {error   && <div className="text-destructive">Error: {error}</div>}
          </div>
        )}

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