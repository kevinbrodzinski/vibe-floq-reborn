import React, { useMemo, useState, useEffect } from 'react';
import DeckGL                    from '@deck.gl/react';
import type { MapViewState }     from '@deck.gl/core';

import { VibeDensityWebMap }     from '@/components/maps/VibeDensityWebMap';
import { VibeDensityBackground } from '@/components/map/VibeDensityBackground';
import { VibeDensityEmpty }      from '@/components/map/VibeDensityEmpty';
import { ClusterLegend }         from '@/components/map/ClusterLegend';
import { VibeDensityShell }      from '@/components/map/VibeDensityShell';
import { VibeFilterBar }         from '@/components/map/VibeFilterBar';

import { useClusters }           from '@/hooks/useClusters';
import { useFieldViewport }      from '@/hooks/useFieldViewport';
import { useVibeFilter }         from '@/hooks/useVibeFilter';
import { createDensityLayer }    from '@/components/map/DeckLayers';
import { renderClusterTooltip }  from '@/components/map/tooltipHelpers';

import {
  Sheet,
  SheetContent,
  SheetHeader,
} from '@/components/ui/sheet';

import type { Cluster }          from '@/hooks/useClusters';
import type { ViewportBounds }   from 'packages/ui/src/maps/types';

export const VibeDensityMap: React.FC = () => {
  const { bounds, onRegionChange } = useFieldViewport();
  const [vibeFilterState, vibeFilterHelpers] = useVibeFilter();
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  /* bbox ------------------------------------------------------------ */
  const bbox = useMemo<[number,number,number,number]>(() => {
    if (!bounds) return [-118.5, 33.9, -118.0, 34.1];
    return [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat];
  }, [bounds]);

  /* clusters -------------------------------------------------------- */
  const { clusters, loading, error, realtime } = useClusters(bbox, 6);

  const filtered = useMemo(() => {
    if (!vibeFilterHelpers.activeSet?.size) return clusters;
    return clusters.filter(c =>
      Object.keys(c.vibe_counts || {}).some(v => vibeFilterHelpers.activeSet.has(v))
    );
  }, [clusters, vibeFilterHelpers.activeSet]);

  /* deck.gl layer --------------------------------------------------- */
  const layers = useMemo(() => {
    if (!filtered.length) return [];
    const weights = Object.fromEntries(
      (vibeFilterHelpers.activeSet ? [...vibeFilterHelpers.activeSet] : []).map(v => [v, 1])
    );
    return [createDensityLayer(filtered, weights, setSelectedCluster)];
  }, [filtered, vibeFilterHelpers.activeSet]);

  const init: Partial<MapViewState> = { latitude: 34.05, longitude: -118.24, zoom: 11 };

  /* ---------------------------------------------------------------- */
  return (
    <div className="absolute inset-0">
      <VibeDensityShell
        realtime={realtime}
        spots={filtered.length}
        people={clusters.reduce((sum, c) => sum + (c.total || 0), 0)}
        onFilterClick={() => setShowFilter(true)}
        onClose={() => console.log('Close clicked')}
      >
        {/* Header chips - always visible */}
        <div className="absolute top-16 left-4 z-10">
          <VibeFilterBar state={vibeFilterState} helpers={vibeFilterHelpers} />
        </div>

        {/* FILTER PANEL – slides in from the left */}
        <Sheet open={showFilter} onOpenChange={setShowFilter}>
          <SheetContent side="left" className="w-72 sm:w-80">
            <SheetHeader className="mb-4">
              <h2 className="text-lg font-semibold">Filter vibes</h2>
            </SheetHeader>
            <VibeFilterBar
              state={vibeFilterState}
              helpers={vibeFilterHelpers}
            />
          </SheetContent>
        </Sheet>

        <VibeDensityWebMap visible={true} onRegionChange={onRegionChange}>
          <VibeDensityBackground />

          {/* only render deck.gl when layers available */}
          {layers.length > 0 && (
            <DeckGL
              layers={layers}
              initialViewState={init}
              getTooltip={({ object }) =>
                object && { html: renderClusterTooltip(object), style: { pointerEvents: 'none' } }
              }
            />
          )}

          <VibeDensityEmpty isLoading={loading} error={error} clustersCount={filtered.length} />

          {import.meta.env.DEV && (
            <div className="absolute top-3 left-3 text-[10px] font-mono bg-background/80 backdrop-blur px-2 py-1 rounded">
              {filtered.length}/{clusters.length} clusters • realtime {realtime ? '🟢' : '⚪'}
            </div>
          )}

          {filtered.length > 0 && (
            <ClusterLegend clusters={filtered} className="absolute bottom-4 right-4" />
          )}
        </VibeDensityWebMap>
      </VibeDensityShell>
    </div>
  );
};