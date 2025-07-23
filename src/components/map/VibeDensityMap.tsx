
import React, { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Sheet,
  SheetPortal,
  SheetOverlay,
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
import { supabase } from '@/integrations/supabase/client';
import type { Cluster } from '@/hooks/useClusters';

const MAPBOX_STYLE = 'mapbox://styles/kevinbrodzinski/cmdfam7kl000501sjbdoz2g4x';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userLocation: { lat: number; lng: number } | null;
  clusters?: Cluster[];
}

export function VibeDensityMap({
  open,
  onOpenChange,
  userLocation,
  clusters: propClusters,
}: Props) {
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Fetch Mapbox token from edge function
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          throw new Error('No token returned');
        }
      } catch (error) {
        console.warn('Failed to fetch Mapbox token:', error);
        setTokenError('Failed to load map token');
        // Fallback to public token for development
        setMapboxToken('pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw');
      }
    };

    fetchToken();
  }, []);

  /* ─── guards ─────────────────────────────────────────────── */
  if (!userLocation) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetPortal>
          <SheetOverlay className="bg-background/60 backdrop-blur-sm" />
          <SheetContent side="bottom" className="h-96 max-w-[640px] mx-auto">
            <SheetHeader>
              <SheetTitle>No location</SheetTitle>
            </SheetHeader>
            <p className="grid h-full place-items-center text-muted-foreground">
              🛰️ Unable to determine your location.
            </p>
          </SheetContent>
        </SheetPortal>
      </Sheet>
    );
  }

  /* ─── user prefs & filters ───────────────────────────────── */
  const [prefs, filterHelpers] = useVibeFilter();

  /* ─── cluster data fetch ─────────────────────────────────── */
  const bbox = useMemo(() => {
    const offset = 0.01;
    return [
      userLocation.lng - offset,
      userLocation.lat - offset,
      userLocation.lng + offset,
      userLocation.lat + offset,
    ] as const;
  }, [userLocation]);

  const { clusters = [], loading, error } = useClusters(bbox, 6);
  const allClusters = propClusters?.length ? propClusters : clusters;
  const visibleClusters = useMemo(() => {
    if (!filterHelpers.isFiltered) return allClusters;
    return allClusters.filter((cluster) =>
      Object.keys(cluster.vibe_counts).some((vibe) =>
        filterHelpers.activeSet.has(vibe as any)
      )
    );
  }, [allClusters, filterHelpers]);

  /* ─── deck.gl layers ─────────────────────────────────────── */
  const densityLayer = createDensityLayer(visibleClusters, prefs, () => {});
  const pulseLayer = usePulseLayer(visibleClusters, prefs);
  const layers = [densityLayer, pulseLayer].filter(Boolean);

  /* ─── stats ──────────────────────────────────────────────── */
  const totals = {
    people: visibleClusters.reduce((sum, cluster) => sum + cluster.total, 0),
    spots: visibleClusters.length,
  };

  /* ─── view state ─────────────────────────────────────────── */
  const initialViewState = {
    latitude: userLocation.lat,
    longitude: userLocation.lng,
    zoom: 12,
  };

  /* ─── esc-to-close ───────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  /* ─── render ─────────────────────────────────────────────── */
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay className="bg-background/60 backdrop-blur-sm" />

        <SheetContent
          side="bottom"
          className="h-[100dvh] max-w-[640px] mx-auto flex flex-col px-4 pb-0 pt-4"
        >
          <SheetClose
            className="absolute right-4 top-4 z-20 rounded-full p-2 hover:bg-accent/20 transition-colors"
            aria-label="Close"
          >
            ✕
          </SheetClose>

          {/* header */}
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

          {/* map area */}
          <div className="relative flex-1 rounded-xl overflow-hidden">
            {!mapboxToken ? (
              <div className="grid h-full place-items-center text-muted-foreground">
                {tokenError ? tokenError : 'Loading map...'}
              </div>
            ) : (
              <MapErrorBoundary>
                <DeckGL
                  initialViewState={initialViewState}
                  controller={true}
                  layers={layers}
                  style={{ position: 'absolute', inset: 0 }}
                >
                  <Map
                    reuseMaps
                    mapStyle={MAPBOX_STYLE}
                    mapboxAccessToken={mapboxToken}
                    attributionControl={false}
                    interactive={false}
                  />
                </DeckGL>
                
                {!loading && layers.length === 0 && (
                  <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                    {error ? 'Map data offline' : 'No vibes detected here yet'}
                  </div>
                )}
              </MapErrorBoundary>
            )}
          </div>

          {/* footer */}
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
      </SheetPortal>
    </Sheet>
  );
}
