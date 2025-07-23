// src/components/VibeDensityMap.tsx
import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';

import { VibeDensityWebMap } from '@/components/maps/VibeDensityWebMap';
import { VibeDensityHeatOverlay } from '@/components/maps/VibeDensityHeatOverlay'; // ← just the file you pasted
import { useClusters } from '@/hooks/useClusters';      // whatever hook you use to fetch clusters

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

interface Props {
  /** drives <Sheet /> from the parent */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export const VibeDensityMap: React.FC<Props> = ({ open, onOpenChange }) => {
  /* keep the current map viewport so we can query clusters ------------ */
  const [bbox, setBbox] = useState({
    minLat: 0,
    minLng: 0,
    maxLat: 0,
    maxLng: 0,
    zoom: 11,
  });

  /* fetch clusters for the current bounds ---------------------------- */
  const {
    data: clusters = [],
    isFetching,
    isError,
  } = useClusters(
    [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat] as [
      number,
      number,
      number,
      number,
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

        {/* actual map -------------------------------------------------- */}
        <div className="relative flex-1">
          <VibeDensityWebMap
            visible={open}          /* mounts / unmounts Web-GL safely  */
            onRegionChange={setBbox} /* updates bbox for cluster query   */
          >
            {/* overlay renders *inside* the map container -------------- */}
            <VibeDensityHeatOverlay
              vibes={clusters}
              containerWidth={window.innerWidth}
              containerHeight={window.innerHeight * 0.85}
              showLabels
              interactive
              onVibeClick={(v) => console.log('clicked', v)}
            />
          </VibeDensityWebMap>

          {/* optional loading / error UI ------------------------------ */}
          {isFetching && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <span className="animate-spin h-6 w-6 rounded-full border-b-2 border-primary" />
            </div>
          )}
          {isError && (
            <div className="absolute inset-0 grid place-items-center text-destructive text-sm">
              Failed to load vibe data
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};