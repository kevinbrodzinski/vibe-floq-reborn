import React, { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
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

  // Fetch Mapbox token
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          throw new Error('No token in response');
        }
      } catch (err) {
        console.warn('Failed to fetch Mapbox token:', err);
        console.log('Error details:', err);
        setTokenError(true);
        // Fallback to public dev token only in development
        if (import.meta.env.DEV) {
          setMapboxToken('pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw');
        }
      }
    };
    fetchToken();
  }, []);

  // User preferences and filters
  const [prefs, filterHelpers] = useVibeFilter();

  // Cluster data fetch
  const bbox = useMemo(() => {
    const offset = 0.01;
    return [
      userLocation.lng - offset,
      userLocation.lat - offset,
      userLocation.lng + offset,
      userLocation.lat + offset,
    ] as [number, number, number, number];
  }, [userLocation]);

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

  // Debug logging
  console.log('VibeDensityMap debug:', {
    mapboxToken: !!mapboxToken,
    tokenError,
    allClusters: allClusters.length,
    visibleClusters: visibleClusters.length,
    layers: layers.length,
    prefs,
    prefWeights
  });

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
          {!mapboxToken ? (
            <div className="pointer-events-none grid h-full place-items-center text-muted-foreground">
              {tokenError ? 'Map unavailable' : 'Loading map...'}
            </div>
          ) : (
            <MapErrorBoundary>
              <DeckGL
                initialViewState={initialViewState as any}
                controller={true}
                layers={layers}
                style={{ position: 'absolute', inset: '0', background: '#1a1a1a' }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: '0',
                    background: `url('https://api.mapbox.com/styles/v1/${MAPBOX_STYLE.replace('mapbox://styles/', '')}/static/${userLocation.lng},${userLocation.lat},12/600x400@2x?access_token=${mapboxToken}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    zIndex: 1,
                  }}
                />
                {/* Debug info */}
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    left: '10px', 
                    background: 'rgba(0,0,0,0.7)', 
                    color: 'white', 
                    padding: '8px', 
                    fontSize: '12px',
                    zIndex: 10 
                  }}
                >
                  Token: {mapboxToken ? 'YES' : 'NO'}<br/>
                  Layers: {layers.length}<br/>
                  Clusters: {visibleClusters.length}
                </div>
              </DeckGL>
            </MapErrorBoundary>
          )}

          {!loading && layers.length === 0 && mapboxToken && (
            <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground pointer-events-none">
              No vibes detected here yet
            </div>
          )}
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