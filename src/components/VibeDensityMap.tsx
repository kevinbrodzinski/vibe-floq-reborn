import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetTrigger,
} from '@/components/ui/sheet';

import { VibeDensityWebMap }    from '@/components/maps/VibeDensityWebMap';
import { VibeDensityHeatOverlay } from '@/components/maps/VibeDensityHeatOverlay';
import { VibeDensityShell }     from '@/components/map/VibeDensityShell';
import { VibeFilterBar }        from '@/components/map/VibeFilterBar';
import { useClusters }          from '@/hooks/useClusters';
import { useVibeFilter }        from '@/hooks/useVibeFilter';

/* ------------------------------------------------------------------ */
/* Types & props                                                      */
/* ------------------------------------------------------------------ */

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export const VibeDensityMap: React.FC<Props> = ({ open, onOpenChange }) => {
  /* viewport state comes from the map */
  const [bbox, setBbox] = useState({
    minLat: 34.0,
    minLng: -118.5,
    maxLat: 34.1,
    maxLng: -118.0,
    zoom:   11,
  });

  /* vibe filtering -------------------------------------------------- */
  const [vibeFilterState, vibeFilterHelpers] = useVibeFilter();

  /* cluster query --------------------------------------------------- */
  const {
    clusters      = [],
    loading,
    error,
    realtime,                      // renamed   (was isRealTimeConnected)
  } = useClusters(
    [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat],
    Math.round(bbox.zoom)
  );

  /* filter clusters based on active vibes -------------------------- */
  const filteredClusters = React.useMemo(() => {
    if (!vibeFilterHelpers.activeSet?.size) return clusters;
    return clusters.filter(c =>
      Object.keys(c.vibe_counts || {}).some(v => vibeFilterHelpers.activeSet.has(v as any))
    );
  }, [clusters, vibeFilterHelpers.activeSet]);

  /* calculate people count ------------------------------------------ */
  const totalPeople = React.useMemo(() => 
    filteredClusters.reduce((sum, c) => sum + c.total, 0), 
    [filteredClusters]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="p-0 h-[85vh] sm:h-[90vh] flex flex-col">
        
        <VibeDensityShell
          realtime={realtime}
          spots={filteredClusters.length}
          people={totalPeople}
          onClose={() => onOpenChange(false)}
        >
          {/* ──────────────────────────────────────────────────────────────── */}
          {/* FILTER PANEL  – slides in from the left                      */}
          {/* ──────────────────────────────────────────────────────────────── */}
          <Sheet>
            {/* the chip that lives in the header */}
            <SheetTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-full bg-muted/30 px-4 py-1 text-sm font-medium hover:bg-muted/40 transition">
                Filter vibes
                {/* tiny chevron icon – optional */}
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </SheetTrigger>

            {/* the actual side panel */}
            <SheetContent side="left" className="w-72 sm:w-80">
              <SheetHeader className="mb-4">
                <h2 className="text-lg font-semibold">Filter vibes</h2>
              </SheetHeader>

              {/* everything that was inside <VibeFilterBar … /> goes here */}
              <VibeFilterBar
                state={vibeFilterState}
                helpers={vibeFilterHelpers}
              />
            </SheetContent>
          </Sheet>

          <VibeDensityWebMap
            visible={open}            /* required prop */
            onRegionChange={setBbox}
          >
            {/* Heat overlay expects vibes, not clusters ------------- */}
            <VibeDensityHeatOverlay
              vibes={filteredClusters.map(c => ({
                id: c.gh6,
                x: ((c.centroid.coordinates[0] + 118.5) / 0.5) * 100,
                y: ((34.1 - c.centroid.coordinates[1]) / 0.1) * 100,
                intensity: Math.min(1, c.total / 50),
                type: Object.keys(c.vibe_counts)[0] as any || 'chill'
              }))}
              containerWidth={window.innerWidth}
              containerHeight={window.innerHeight * 0.85}
              onVibeClick={v => console.log('clicked', v)}
            />
          </VibeDensityWebMap>

          {/* lightweight UI states ----------------------------------- */}
          {loading && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <span className="animate-spin h-6 w-6 rounded-full border-b-2 border-primary" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 grid place-items-center text-destructive text-sm">
              Failed to load vibe data
            </div>
          )}
          {import.meta.env.DEV && (
            <div className="absolute top-3 left-3 rounded bg-background/80 backdrop-blur px-2 py-1 text-[10px] font-mono">
              {filteredClusters.length}/{clusters.length} clusters • realtime {realtime ? '🟢' : '⚪'}
            </div>
          )}
        </VibeDensityShell>

      </SheetContent>
    </Sheet>
  );
};