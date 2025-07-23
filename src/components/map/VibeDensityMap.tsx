/**
 * Big, full-screen vibe-density visual for the “Field” screen
 * ────────────────────────────────────────────────────────────
 * • Supplies Mapbox map (VibeDensityWebMap)
 * • Adds Deck.GL density layer
 * • Shows empty / loading states & a tiny debug HUD (DEV only)
 */
import React, { useEffect, useMemo, useState } from 'react';
import DeckGL            from '@deck.gl/react';
import type { MapViewState } from '@deck.gl/core';

import { VibeDensityWebMap }  from '@/components/maps/VibeDensityWebMap';
import { VibeDensityBackground } from '@/components/map/VibeDensityBackground';
import { VibeDensityEmpty }   from '@/components/map/VibeDensityEmpty';
import { ClusterLegend }      from '@/components/map/ClusterLegend';
import { createDensityLayer } from '@/components/map/DeckLayers';
import { renderClusterTooltip } from '@/components/map/tooltipHelpers';

import { useFieldViewport } from '@/hooks/useFieldViewport';
import { useClusters }      from '@/hooks/useClusters';
import { useVibeFilter }    from '@/hooks/useVibeFilter';
import type { Cluster }     from '@/hooks/useClusters';

/* ------------------------------------------------------------------ */
type VibeWeights = Record<string, number>;
/* ------------------------------------------------------------------ */

export const VibeDensityMap: React.FC = () => {
  /* sync view state (pans / zooms) with parent ---------------------- */
  const { bounds, onRegionChange } = useFieldViewport();

  /* vibe-filter (toggle chips) -------------------------------------- */
  const [vibeFilterState, vibeHelpers] = useVibeFilter();

  /* convert bounds → bbox for cluster query ------------------------- */
  const bbox = useMemo<[number, number, number, number]>(() => {
    if (!bounds) return [-118.5, 33.9, -118.0, 34.1];
    return [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat];
  }, [bounds]);

  /* fetch clusters & realtime flag ---------------------------------- */
  const { clusters, loading, error, realtime } = useClusters(bbox, 6);

  /* vibe-filter applied to clusters --------------------------------- */
  const filteredClusters = useMemo(() => {
    if (!vibeHelpers.activeSet?.size) return clusters;
    return clusters.filter(c =>
      Object.keys(c.vibe_counts).some(v => vibeHelpers.activeSet.has(v as any)),
    );
  }, [clusters, vibeHelpers.activeSet]);

  /* deck.gl layer ---------------------------------------------------- */
  const layers = useMemo(() => {
    if (!filteredClusters.length) return [];

    const weights: VibeWeights = Object.fromEntries(
      Array.from(vibeHelpers.activeSet).map(v => [v, 1]),
    );

    return [
      createDensityLayer(filteredClusters, weights, c =>
        console.log('[VibeDensity] clicked cluster', c),
      ),
    ];
  }, [filteredClusters, vibeHelpers.activeSet]);

  /* ------------------------------------------------------------------ */
  return (
    <div className="absolute inset-0 overflow-hidden">
      <VibeDensityWebMap
        visible                 /* always visible on this screen      */
        onRegionChange={onRegionChange}
      >
        {/* background pattern */}
        <VibeDensityBackground />

        {/* deck.GL overlay */}
        {layers.length > 0 && (
          <DeckGL
            initialViewState={{
              latitude : 34.05,
              longitude: -118.24,
              zoom     : 11,
            } as Partial<MapViewState>}
            layers={layers}
            getTooltip={({ object }) =>
              object && {
                html : renderClusterTooltip(object),
                style: { pointerEvents: 'none' },
              }}
          />
        )}

        {/* empty / loading */}
        <VibeDensityEmpty
          isLoading={loading}
          error={error}
          clustersCount={filteredClusters.length}
        />

        {/* DEV HUD ---------------------------------------------------- */}
        {import.meta.env.DEV && (
          <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3 text-xs font-mono z-[60]">
            <div>Clusters  {filteredClusters.length}/{clusters.length}</div>
            <div>Realtime  {realtime ? 'ON' : 'OFF'}</div>
            {loading && <div>Loading…</div>}
            {error   && <div className="text-destructive">Error: {error}</div>}
          </div>
        )}

        {/* legend */}
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