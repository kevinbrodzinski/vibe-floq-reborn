import React, { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { renderClusterTooltip } from '@/components/screens/field/tooltipHelpers';
import { createDensityLayer } from '@/components/map/DeckLayers';

import { VibeDensityWebMap } from '@/components/maps/VibeDensityWebMap';
import { VibeDensityBackground } from '@/components/map/VibeDensityBackground';
import { VibeDensityEmpty } from '@/components/map/VibeDensityEmpty';
import { ClusterLegend } from '@/components/map/ClusterLegend';
import { useClusters } from '@/hooks/useClusters';
import { useVibeFilter } from '@/hooks/useVibeFilter';
import { useFieldViewport } from '@/hooks/useFieldViewport';

import type { MapViewState } from '@deck.gl/core';
import type { Cluster } from '@/hooks/useClusters';

type VibeWeights = Record<string, number>;

export const VibeDensityMap: React.FC = () => {
  const { bounds, onRegionChange } = useFieldViewport();
  const { activeSet } = useVibeFilter();

  /* ------------------------------------------------------------------ */
  /* cluster query ----------------------------------------------------- */
  const bbox = useMemo<[number, number, number, number]>(() => {
    if (!bounds) return [-118.5, 33.9, -118.0, 34.1];
    return [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat];
  }, [bounds]);

  const { clusters, loading, error, realtime } = useClusters(bbox, 6);

  /* ------------------------------------------------------------------ */
  /* filtering --------------------------------------------------------- */
  const filtered = useMemo(() => {
    if (!activeSet || activeSet.size === 0) return clusters;
    return clusters.filter((c) =>
      Object.keys(c.vibe_counts ?? {}).some((v) => activeSet.has(v)),
    );
  }, [clusters, activeSet]);

  /* ------------------------------------------------------------------ */
  /* deck.gl layer ----------------------------------------------------- */
  const layers = useMemo(() => {
    const weights: VibeWeights = activeSet
      ? Object.fromEntries(Array.from(activeSet).map((v) => [v, 1]))
      : {};
    const l = createDensityLayer(filtered, weights, () => {});
    return l ? [l] : [];
  }, [filtered, activeSet]);

  const initialViewState: Partial<MapViewState> = {
    latitude: 34.05,
    longitude: -118.24,
    zoom: 11,
  };

  /* ------------------------------------------------------------------ */
  /* render ------------------------------------------------------------ */
  return (
    <div className="absolute inset-0 overflow-hidden">
      <VibeDensityWebMap visible onRegionChange={onRegionChange}>
        <VibeDensityBackground />

        {layers.length > 0 && (
          <DeckGL
            layers={layers}
            initialViewState={initialViewState}
            getTooltip={({ object }) =>
              object && {
                html: renderClusterTooltip(object),
                style: { pointerEvents: 'none' },
              }
            }
          />
        )}

        <VibeDensityEmpty
          isLoading={loading}
          error={error}
          clustersCount={filtered.length}
        />

        {import.meta.env.DEV && (
          <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3 text-xs font-mono">
            <div>Clusters: {filtered.length}</div>
            <div>Real-time: {realtime ? 'ON' : 'OFF'}</div>
          </div>
        )}

        {filtered.length > 0 && (
          <ClusterLegend
            clusters={filtered}
            className="absolute bottom-4 right-4"
          />
        )}
      </VibeDensityWebMap>
    </div>
  );
};