import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';

import { VibeDensityWebMap }   from '@/components/maps/VibeDensityWebMap';
import { VibeDensityHeatOverlay } from '@/components/maps/VibeDensityHeatOverlay';
import { useClusters }         from '@/hooks/useClusters';

/* ------------------------------------------------------------------ */
/* Props                                                              */
/* ------------------------------------------------------------------ */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
export const VibeDensityMap: React.FC<Props> = ({ open, onOpenChange }) => {
  /* keep the current viewport so we can query clusters --------------- */
  const [bbox, setBbox] = useState({
    minLat: 0,
    minLng: 0,
    maxLat: 0,
    maxLng: 0,
    zoom: 11,
  });

  /* fetch clusters for the current bounds --------------------------- */
  const {
    clusters = [],
    loading,
    error,
  } = useClusters(
    [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat] as [
      number,
      number,
      number,
      number
    ],
    Math.round(bbox.zoom),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 h-[85vh] sm:h-[90vh] flex flex-col"
      >
        <SheetHeader className="border-b border-border/40 px-4 py-3">
          <SheetTitle>Vibe Density Map</SheetTitle>
          <SheetClose className="sr-only">Close</SheetClose>
        </SheetHeader>

        {/* map -------------------------------------------------------- */}
        <div className="relative flex-1">
          <VibeDensityWebMap
            visible={open}            {/* mounts / unmounts safely */}
            onRegionChange={setBbox}   /* updates bbox for query    */
          >
            <VibeDensityHeatOverlay
              vibes={clusters}
              containerWidth={window.innerWidth}
              containerHeight={window.innerHeight * 0.85}
              showLabels
              interactive
              onVibeClick={v => console.log('clicked', v)}
            />
          </VibeDensityWebMap>

          {/* loading / error overlays -------------------------------- */}
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