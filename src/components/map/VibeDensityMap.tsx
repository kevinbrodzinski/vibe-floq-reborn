import React, { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { VibeDensityWebMap } from '@/components/maps/VibeDensityWebMap';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { MapErrorBoundary } from './MapErrorBoundary';
import { ClusterLegend } from './ClusterLegend';
import { VibeFilterPanel } from './VibeFilterPanel';
import { createDensityLayer, usePulseLayer } from './DeckLayers';
import { useClusters } from '@/hooks/useClusters';
import { useVibeFilter } from '@/hooks/useVibeFilter';
import type { Cluster } from '@/hooks/useClusters';
import type { VibeFilterState } from '@/hooks/useVibeFilter';

const MAPBOX_STYLE = 'mapbox://styles/kevinbrodzinski/cmdfam7kl000501sjbdoz2g4x';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userLocation: { lat: number; lng: number } | null;
  clusters?: Cluster[];
}

export function VibeDensityMap({
  open,
  onOpenChange,
  userLocation,
  clusters: propClusters,
}: Props) {
  console.log('[VibeDensityMap] Rendering with:', { open, userLocation: !!userLocation });
  
  // Guards
  if (!userLocation) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-96 max-w-[640px] mx-auto">
          <SheetHeader>
            <SheetTitle>No location</SheetTitle>
          </SheetHeader>
          <p className="grid h-full place-items-center text-muted-foreground">
            🛰️ Unable to determine your location.
          </p>
        </SheetContent>
      </Sheet>
    );
  }

  // Map viewport state
  const [viewport, setViewport] = useState({
    minLat: userLocation.lat - 0.01,
    minLng: userLocation.lng - 0.01,
    maxLat: userLocation.lat + 0.01,
    maxLng: userLocation.lng + 0.01,
    zoom: 12,
  });

  // User preferences and filters
  const [prefs, filterHelpers] = useVibeFilter();

  // Cluster data fetch using viewport
  const bbox = useMemo(() => [
    viewport.minLng,
    viewport.minLat,
    viewport.maxLng,
    viewport.maxLat,
  ] as [number, number, number, number], [viewport]);

  const { clusters = [], loading, error } = useClusters(bbox, 6);
  const allClusters = propClusters?.length ? propClusters : clusters;
  const visibleClusters = useMemo(() => {
    if (!filterHelpers.isFiltered) return allClusters;
    return allClusters.filter(cluster =>
      Object.keys(cluster.vibe_counts).some(vibe => 
        filterHelpers.activeSet.has(vibe as any)
      )
    );
  }, [allClusters, filterHelpers]);

  // Create preference weights for layers
  const prefWeights = useMemo(() => {
    const weights: Record<string, number> = {};
    Object.entries(prefs).forEach(([vibe, enabled]) => {
      weights[vibe] = enabled ? 1 : 0;
    });
    return weights;
  }, [prefs]);

  // Deck.gl layers
  const densityLayer = createDensityLayer(visibleClusters, prefWeights, () => {});
  const pulseLayer = usePulseLayer(visibleClusters, prefWeights);
  const layers = [densityLayer, pulseLayer].filter(Boolean);

  // Handle region changes from map
  const handleRegionChange = (bounds: typeof viewport) => {
    setViewport(bounds);
  };

  // Stats
  const totals = {
    people: visibleClusters.reduce((sum, cluster) => sum + cluster.total, 0),
    spots: visibleClusters.length,
  };

  // View state
  const initialViewState = {
    latitude: userLocation.lat,
    longitude: userLocation.lng,
    zoom: 12,
    bearing: 0,
    pitch: 0,
  };

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  // Render
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-screen max-h-[100dvh] max-w-[640px] mx-auto flex flex-col px-4 pb-0 pt-4"
      >
        <SheetClose
          className="absolute right-4 top-4 z-20 rounded-full p-2 hover:bg-accent/20 transition-colors"
          aria-label="Close map"
        >
          ✕
          <span className="sr-only">Close map</span>
        </SheetClose>

        {/* Header */}
        <SheetHeader className="mb-3 flex items-center justify-between gap-3">
          <SheetTitle className="text-lg font-semibold">
            Vibe Density Map
          </SheetTitle>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              <span className="mr-1 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              LIVE
            </Badge>
            <VibeFilterPanel value={prefs} onChange={filterHelpers.replace} />
          </div>
        </SheetHeader>

        {/* Map area */}
        <div className="relative flex-1 rounded-xl overflow-hidden bg-background">
          <MapErrorBoundary>
            <VibeDensityWebMap onRegionChange={handleRegionChange}>
              <DeckGL
                initialViewState={initialViewState as any}
                controller={true}
                layers={layers}
                style={{ position: 'absolute', inset: '0', pointerEvents: 'none' }}
              />
              
              {!loading && layers.length === 0 && (
                <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground pointer-events-none">
                  No vibes detected here yet
                </div>
              )}
            </VibeDensityWebMap>
          </MapErrorBoundary>
        </div>

        {/* Footer */}
        <SheetFooter className="min-h-[3.5rem] px-4 py-2 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <span>{totals.spots} spots</span>
            <span aria-hidden>•</span>
            <span>{totals.people} people</span>
            {filterHelpers.isFiltered && (
              <>
                <span aria-hidden>•</span>
                <span>
                  {Object.keys(prefs).length - filterHelpers.activeSet.size} vibes off
                </span>
              </>
            )}
          </div>
          <ClusterLegend clusters={visibleClusters} className="mt-2" />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}