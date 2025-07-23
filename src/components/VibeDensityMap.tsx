import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';

import { VibeDensityWebMap }    from '@/components/maps/VibeDensityWebMap';
import { VibeDensityHeatOverlay } from '@/components/maps/VibeDensityHeatOverlay';
import { VibeFilterBar }        from '@/components/map/VibeFilterBar';
import { useClusters }            from '@/hooks/useClusters';

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="p-0 h-[85vh] sm:h-[90vh] flex flex-col">
        <SheetHeader className="border-b border-border/40 px-4 py-3">
          <SheetTitle>Vibe Density Map</SheetTitle>
          <SheetClose className="sr-only">Close</SheetClose>
        </SheetHeader>

        {/* Map -------------------------------------------------------- */}
        <div className="relative flex-1">
          {/* 🔹 NEW – filter chips */}
          <VibeFilterBar />
          <VibeDensityWebMap
            visible={open}            /* required prop */
            onRegionChange={setBbox}
          >
            {/* Heat overlay expects vibes, not clusters ------------- */}
            <VibeDensityHeatOverlay
              vibes={clusters.map(c => ({
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
              {clusters.length} clusters • realtime {realtime ? '🟢' : '⚪'}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};