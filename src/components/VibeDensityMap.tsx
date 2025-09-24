/* ------------------------------------------------------------------ */
/*  VibeDensityMap – pop-up sheet with Deck.GL heat-overlay & filter  */
/* ------------------------------------------------------------------ */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import mapboxgl from 'mapbox-gl';
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
import { myLocationLayer } from '@/components/map/layers/MyLocationLayer';

import { useClusters } from '@/hooks/useClusters';
import { useVibeFilter } from '@/hooks/useVibeFilter';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';
import { getMapInstance } from '@/lib/geo/project';

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

  /* user location using unified system ------------------------------- */
  const userLocationHook = useUnifiedLocation({
    enableTracking: false, // Don't need server tracking for this
    hookId: 'vibe-density-map'
  });

  // Start/stop location tracking based on modal open state
  useEffect(() => {
    if (open) {
      userLocationHook.startTracking();
    } else {
      userLocationHook.stopTracking();
    }
  }, [open, userLocationHook.startTracking, userLocationHook.stopTracking]);

  const userLocation = userLocationHook.coords;

  /* convert clusters to VibeData for overlay ------------------------- */
  const vibePoints = filteredClusters.map((c) => ({
    id: c.gh6,
    x: ((c.centroid.coordinates[0] + 118.5) / 0.5) * 100,
    y: ((34.1 - c.centroid.coordinates[1]) / 0.1) * 100,
    intensity: Math.min(1, c.total / 50),
    type: (Object.keys(c.vibe_counts)[0] as any) || 'chill',
  }));

  /* deck.gl layers --------------------------------------------------- */
  const deckLayers = useMemo(() => {
    const layers = [];

    // TODO: Add density layer here when migrating from SVG/Canvas to Deck.GL
    // layers.push(densityLayer);

    // Add user location layer (last so it's on top)
    if (userLocation) {
      layers.push({
        ...myLocationLayer,
        id: 'user-location',
        data: [{ position: [userLocation.lng, userLocation.lat] }]
      });
    }

    return layers;
  }, [userLocation ? `${userLocation.lat},${userLocation.lng}` : null]);

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
          <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full select-none ${
            realtime ? 'bg-emerald-600/20 text-emerald-400' : 'bg-muted/20 text-muted-foreground'
          }`}>
            LIVE
          </span>

          {/* Filter chips in header - only show when filtered */}
          {vibeHelpers.isFiltered && (
            <div className="flex gap-1">
              {Object.entries(vibeState).filter(([, active]) => active).slice(0, 3).map(([vibe]) => (
                <button
                  key={vibe}
                  onClick={() => vibeHelpers.toggle(vibe as any)}
                  className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-primary text-primary-foreground"
                >
                  {vibe}
                </button>
              ))}
              {vibeHelpers.activeSet.size > 3 && (
                <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-muted/20 text-muted-foreground">
                  +{vibeHelpers.activeSet.size - 3}
                </span>
              )}
            </div>
          )}

          {/* slide-out trigger */}
          <button
            onClick={() => setShowFilter(true)}
            className="text-[11px] font-medium px-3 py-1 rounded-lg border border-border hover:bg-muted/20 transition-colors"
            aria-label="Open vibe filters">
            Filter vibes
          </button>

          <SheetClose className="sr-only">Close</SheetClose>
        </SheetHeader>

        {/* ───────────── filter side-panel (left) ───────────────────── */}
        <Sheet open={showFilter} onOpenChange={setShowFilter}>
          <SheetContent side="left" className="w-72 sm:w-80">
            <SheetHeader className="mb-4">
              <h2 className="text-lg font-semibold">Filter vibes</h2>
            </SheetHeader>
            <VibeFilterBar state={vibeState} helpers={vibeHelpers} />
          </SheetContent>
        </Sheet>

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

            {/* deck.gl layers for user location */}
            {deckLayers.length > 0 && (
              <DeckGL
                style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0' }}
                layers={deckLayers}
                controller={false}
              />
            )}

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