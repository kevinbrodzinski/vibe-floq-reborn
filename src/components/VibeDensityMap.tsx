import React, { useState, useMemo, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

import { VibeDensityWebMap }   from '@/components/maps/VibeDensityWebMap';
import { VibeDensityHeatOverlay } from '@/components/maps/VibeDensityHeatOverlay';
import { VibeFilterBar }       from '@/components/map/VibeFilterBar';

import { useClusters }         from '@/hooks/useClusters';
import { useVibeFilter }       from '@/hooks/useVibeFilter';

import type { Cluster }        from '@/hooks/useClusters';
import type { VibeData }       from '@/components/maps/VibeDensityHeatOverlay';

/* —————————————————————————————————————————— */
/* helper: turn backend cluster → heat overlay */
const clusterToVibe = (c: Cluster): VibeData => ({
  id:        c.gh6,
  // crude lon/lat → % conversion for demo; tweak to taste
  x:         ((c.centroid.coordinates[0] + 118.5) / 0.5) * 100,
  y:         ((34.1 - c.centroid.coordinates[1])  / 0.1) * 100,
  intensity: Math.min(1, c.total / 50),
  type:      (Object.keys(c.vibe_counts)[0] as any) || 'chill',
});
/* —————————————————————————————————————————— */

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export const VibeDensityMap: React.FC<Props> = ({ open, onOpenChange }) => {
  /* viewport bounds that come back from the map component */
  const [bbox, setBbox] = useState({
    minLat: 34.0,
    minLng: -118.5,
    maxLat: 34.1,
    maxLng: -118.0,
    zoom:   11,
  });

  /* vibe filter local-only state */
  const [vibeState, vibeHelpers] = useVibeFilter();

  /* show / hide the left filter sheet */
  const [showFilter, setShowFilter] = useState(false);

  /* clusters fetched for current viewport */
  const {
    clusters   = [],
    loading,
    error,
    realtime,            // renamed in the hook
  } = useClusters(
    [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat],
    Math.round(bbox.zoom)
  );

  /* filter clusters by active vibes */
  const filteredClusters = useMemo(() => {
    if (!vibeHelpers.activeSet?.size) return clusters;
    return clusters.filter(c =>
      Object.keys(c.vibe_counts || {}).some(v =>
        vibeHelpers.activeSet.has(v as string)
      )
    );
  }, [clusters, vibeHelpers.activeSet]);

  /* derive numbers for footer */
  const totalPeople = useMemo(
    () => filteredClusters.reduce((sum, c) => sum + c.total, 0),
    [filteredClusters]
  );

  /** clusters → vibe-data which the heat overlay expects  */
  const vibes: VibeData[] = useMemo(
    () => filteredClusters.map(clusterToVibe),
    [filteredClusters]
  );

  /* ————————————————— render ———————————————— */
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 h-[85vh] sm:h-[90vh] flex flex-col"
      >
        {/* ── header bar ─────────────────────── */}
        <SheetHeader className="border-b border-border/40 px-4 py-3 flex items-center gap-4">
          <SheetTitle className="flex-1">Vibe Density Map</SheetTitle>

          {/* LIVE pill */}
          <span
            className="text-xs font-medium px-3 py-1 rounded-full bg-muted/30
                       text-muted-foreground select-none"
          >
            LIVE
          </span>

          {/* filter-vibe chips (always visible) */}
          <div className="flex-1 overflow-x-auto">
            <VibeFilterBar state={vibeState} helpers={vibeHelpers} />
          </div>

          {/* button that opens the side sheet */}
          <SheetTrigger asChild onClick={() => setShowFilter(true)}>
            <button
              className="ml-2 text-xs px-3 py-1 rounded-lg border border-border
                         hover:bg-muted/20 transition-colors"
            >
              Filter
            </button>
          </SheetTrigger>

          <SheetClose className="sr-only">Close</SheetClose>
        </SheetHeader>

        {/* ── the map itself ─────────────────── */}
        <div className="relative flex-1">
          <VibeDensityWebMap
            visible={open}
            onRegionChange={setBbox}
          >
            <VibeDensityHeatOverlay
              vibes={vibes}
              containerWidth={window.innerWidth}
              containerHeight={window.innerHeight * 0.85}
              onVibeClick={(v) => console.log('clicked', v)}
            />
          </VibeDensityWebMap>

          {/* lightweight ui states */}
          {loading && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <span className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"/>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 grid place-items-center text-destructive text-sm">
              Failed to load vibe data
            </div>
          )}

          {/* dev overlay */}
          {import.meta.env.DEV && (
            <div className="absolute top-4 left-4 bg-background/90
                            backdrop-blur-sm border rounded-lg py-1.5 px-3 text-xs font-mono">
              {filteredClusters.length}/{clusters.length} clusters&nbsp;•&nbsp;
              realtime {realtime ? '🟢' : '⚪'}
            </div>
          )}
        </div>

        {/* footer stats */}
        <div className="text-sm text-muted-foreground py-2 px-4 border-t border-border/40">
          {filteredClusters.length} spots&nbsp;•&nbsp;{totalPeople} people
        </div>

        {/* ── side-sheet filter panel ────────── */}
        <Sheet open={showFilter} onOpenChange={setShowFilter}>
          <SheetContent side="left" className="w-[85vw] max-w-xs p-6">
            <SheetHeader className="mb-4">
              <SheetTitle>Filter vibes</SheetTitle>
            </SheetHeader>

            <VibeFilterBar state={vibeState} helpers={vibeHelpers} />

            <div className="mt-6 flex justify-end">
              <button
                className="text-sm font-medium px-4 py-2 rounded-lg
                           bg-primary text-primary-foreground hover:bg-primary/90
                           transition-colors"
                onClick={() => setShowFilter(false)}
              >
                Apply
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </SheetContent>
    </Sheet>
  );
};