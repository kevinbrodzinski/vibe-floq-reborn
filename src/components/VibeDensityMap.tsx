import React, { useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose,
} from '@/components/ui/sheet';

import { VibeDensityWebMap }      from '@/components/maps/VibeDensityWebMap';
import { VibeDensityHeatOverlay } from '@/components/maps/VibeDensityHeatOverlay';
import { useClusters }            from '@/hooks/useClusters';
import type { Cluster }           from '@/hooks/useClusters';

/* ------------------------------------------------------------------ */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
/* ------------------------------------------------------------------ */

export const VibeDensityMap: React.FC<Props> = ({ open, onOpenChange }) => {
  const [bbox, setBbox] = useState({
    minLat: 0, minLng: 0, maxLat: 0, maxLng: 0, zoom: 11,
  });

  /* ----- fetch clusters for current view --------------------------- */
  const { clusters, loading, error } = useClusters(
    [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat],
    Math.round(bbox.zoom),
  );

  /* ----- convert Cluster → VibeData expected by HeatOverlay -------- */
  const vibes = clusters.map<Parameters<typeof VibeDensityHeatOverlay>[0]['vibes'][0]>((c: Cluster) => ({
    id        : c.gh6,
    x         : ((c.centroid.coordinates[0] + 180) / 360) * 100, // crude projection – replace with your own
    y         : ((90 - c.centroid.coordinates[1])  / 180) * 100,
    intensity : Math.min(1, c.total / 20),
    type      : (Object.keys(c.vibe_counts)[0] || 'chill') as any,
  }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="p-0 h-[85vh] sm:h-[90vh] flex flex-col">
        <SheetHeader className="border-b border-border/40 px-4 py-3">
          <SheetTitle>Vibe Density Map</SheetTitle>
          <SheetClose className="sr-only">Close</SheetClose>
        </SheetHeader>

        {/* MAP --------------------------------------------------------- */}
        <div className="relative flex-1">
          <VibeDensityWebMap
            visible={open}
            onRegionChange={setBbox}
          >
            <VibeDensityHeatOverlay
              vibes={vibes}
              containerWidth={window.innerWidth}
              containerHeight={window.innerHeight * 0.85}
              showLabels
              interactive
              onVibeClick={v => console.log('clicked', v)}
            />
          </VibeDensityWebMap>

          {/* simple overlays */}
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
        </div>
      </SheetContent>
    </Sheet>
  );
};