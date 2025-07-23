/* ------------------------------------------------------------------ */
/*  VibeDensityMap – pop-up sheet with Deck.GL heat-overlay & filter  */
/* ------------------------------------------------------------------ */

import React, { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

import { VibeDensityWebMap } from '@/components/maps/VibeDensityWebMap';
import { VibeDensityHeatOverlay } from '@/components/maps/VibeDensityHeatOverlay';
import { VibeFilterBar } from '@/components/map/VibeFilterBar';

import { useClusters } from '@/hooks/useClusters';
import { useVibeFilter } from '@/hooks/useVibeFilter';

/* ------------------------------------------------------------------ */
/*  Types & props                                                     */
/* ------------------------------------------------------------------ */

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export const VibeDensityMap: React.FC<Props> = ({ open, onOpenChange }) => {
  /* viewport comes from the map -------------------------------------- */
  const [bbox, setBbox] = useState({
    minLat: 34.0,
    minLng: -118.5,
    maxLat: 34.1,
    maxLng: -118.0,
    zoom: 11,
  });

  /* vibe filtering --------------------------------------------------- */
  const [vibeState, vibeHelpers] = useVibeFilter();

  /* cluster query ---------------------------------------------------- */
  const {
    clusters = [],
    loading,
    error,
    realtime, // boolean
  } = useClusters(
    [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat],
    Math.round(bbox.zoom),
  );

  /* filter clusters by active vibes ---------------------------------- */
  const filteredClusters = useMemo(() => {
    if (!vibeHelpers.activeSet.size) return clusters;
    return clusters.filter((c) =>
      Object.keys(c.vibe_counts || {}).some((v) =>
        vibeHelpers.activeSet.has(v as any),
      ),
    );
  }, [clusters, vibeHelpers.activeSet]);

  /* total people in view --------------------------------------------- */
  const totalPeople = useMemo(
    () => filteredClusters.reduce((sum, c) => sum + c.total, 0),
    [filteredClusters],
  );

  /* slide-out panel state ------------------------------------------- */
  const [showFilter, setShowFilter] = useState(false);

  /* convert clusters to VibeData for overlay ------------------------- */
  const vibePoints = filteredClusters.map((c) => ({
    id: c.gh6,
    x: ((c.centroid.coordinates[0] + 118.5) / 0.5) * 100,
    y: ((34.1 - c.centroid.coordinates[1]) / 0.1) * 100,
    intensity: Math.min(1, c.total / 50),
    type: (Object.keys(c.vibe_counts)[0] as any) || 'chill',
  }));

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 h-[92vh] sm:h-[95vh] flex flex-col bg-background">
        {/* ───────────────── header ────────────────────────────────── */}
        <SheetHeader
          className="border-b border-border/30 px-4 py-2 flex items-center gap-3 backdrop-blur-md bg-background/95">
          <SheetTitle className="flex-1 text-base">Vibe Density Map</SheetTitle>

          {/* LIVE pill */}
          <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-muted/20 text-muted-foreground select-none">
            LIVE
          </span>

          {/* active-count badge */}
          {vibeHelpers.isFiltered && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary-foreground select-none">
              {vibeHelpers.activeSet.size}
            </span>
          )}

          {/* slide-out trigger */}
          <SheetTrigger
            asChild
            onClick={() => setShowFilter(true)}>
            <button className="text-[11px] font-medium px-3 py-1 rounded-lg border border-border hover:bg-muted/20 transition-colors">
              Filter
            </button>
          </SheetTrigger>

          <SheetClose className="sr-only">Close</SheetClose>
        </SheetHeader>

        {/* ───────────── filter side-panel (left) ───────────────────── */}
        {showFilter && (
          <div className="fixed inset-y-0 left-0 w-64 z-50 bg-background/95 backdrop-blur-md border-r border-border/30 shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <h2 className="text-sm font-semibold">Filter vibes</h2>
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShowFilter(false)}>
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <VibeFilterBar state={vibeState} helpers={vibeHelpers} />
            </div>
          </div>
        )}

        {/* ───────────────── map / overlay slot ─────────────────────── */}
        <div className="relative flex-1">
          <VibeDensityWebMap
            visible={open}
            onRegionChange={setBbox}>
            <VibeDensityHeatOverlay
              vibes={vibePoints}
              containerWidth={window.innerWidth}
              containerHeight={window.innerHeight * 0.9}
              showLabels
              interactive
              onVibeClick={(v) => console.log('clicked', v)}
            />

            {/* lightweight UI states */}
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

            {/* dev debug */}
            {import.meta.env.DEV && (
              <div className="absolute top-4 left-4 text-xs bg-black/70 text-white px-2 py-1 rounded">
                {filteredClusters.length}/{clusters.length} clusters •
                realtime {realtime ? '🟢' : '⚪'}
              </div>
            )}
          </VibeDensityWebMap>
        </div>

        {/* ───────────────── footer counts ──────────────────────────── */}
        <div className="text-xs text-muted-foreground py-2 px-4 border-t border-border/30">
          {filteredClusters.length} spots • {totalPeople} people
        </div>
      </SheetContent>
    </Sheet>
  );
};