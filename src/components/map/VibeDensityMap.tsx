
import { useState, useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { Badge } from '@/components/ui/badge';
import { MapErrorBoundary } from './MapErrorBoundary';
import { ClusterLegend } from './ClusterLegend';
import { VibeFilterPanel } from './VibeFilterPanel';
import { createDensityLayer, usePulseLayer } from './DeckLayers';
import { useClusters } from '@/hooks/useClusters';
import { useVibeFilter } from '@/hooks/useVibeFilter';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZmxvcXZpYmVzIiwiYSI6ImNtNHUwZmx4bzAzZGsya3M5eWZldHBrOTcifQ.VZWx-Bu3wP1iNSyK7bYIUg';

const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11';

interface VibeDensityMapProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userLocation: { lat: number; lng: number };
}

export function VibeDensityMap({ open, onOpenChange, userLocation }: VibeDensityMapProps) {
  const [vibeFilter, vibeFilterHelpers] = useVibeFilter();

  // Calculate viewport from user location
  const initialViewState = useMemo(() => ({
    latitude: userLocation.lat,
    longitude: userLocation.lng,
    zoom: 12,
    pitch: 0,
    bearing: 0
  }), [userLocation.lat, userLocation.lng]);

  // Calculate bbox for clusters
  const bbox = useMemo(() => {
    const offset = 0.01; // ~1km
    return [
      userLocation.lng - offset,
      userLocation.lat - offset, 
      userLocation.lng + offset,
      userLocation.lat + offset
    ] as [number, number, number, number];
  }, [userLocation.lat, userLocation.lng]);

  // Fetch clusters
  const { 
    clusters = [], 
    loading: clustersLoading, 
    error: clustersError 
  } = useClusters(bbox);

  // Filter clusters by active vibes
  const filteredClusters = useMemo(() => {
    if (!vibeFilterHelpers.isFiltered) return clusters;
    return clusters.filter(cluster => {
      const vibes = Object.keys(cluster.vibe_counts || {});
      return vibes.some(vibe => vibeFilterHelpers.activeSet.has(vibe as any));
    });
  }, [clusters, vibeFilterHelpers.activeSet, vibeFilterHelpers.isFiltered]);

  // Create layers
  const densityLayer = createDensityLayer(
    filteredClusters,
    {},
    () => {} // No click handler needed for density view
  );

  const pulseLayer = usePulseLayer(filteredClusters, {});

  const layers = [densityLayer, pulseLayer].filter(Boolean);

  // Statistics
  const totalPeople = filteredClusters.reduce((sum, c) => sum + c.total, 0);
  const totalSpots = filteredClusters.length;

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (clustersError) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="top" className="h-full">
          <SheetHeader>
            <SheetTitle>Vibe Density Map</SheetTitle>
          </SheetHeader>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground">Unable to load clusters</p>
              <p className="text-sm text-muted-foreground mt-2">{clustersError}</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top" className="h-full p-0">
        <div className="relative h-full flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-b p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <SheetTitle className="text-lg font-semibold">
                  Vibe Density Map
                </SheetTitle>
                <Badge variant="secondary" className="animate-pulse">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                  LIVE
                </Badge>
              </div>
              <VibeFilterPanel 
                value={vibeFilter} 
                onChange={vibeFilterHelpers.replace}
              />
            </div>
          </div>

          {/* Map Container */}
          <div className="flex-1 mt-20">
            {clustersLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading clusters...</p>
                </div>
              </div>
            ) : (
              <MapErrorBoundary>
                <div 
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    background: `url("https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${userLocation.lng},${userLocation.lat},12,0/600x400@2x?access_token=${MAPBOX_TOKEN}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative'
                  }} 
                >
                  <DeckGL
                    initialViewState={initialViewState as any}
                    controller
                    layers={layers}
                    style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%' }}
                  />
                </div>
              </MapErrorBoundary>
            )}
          </div>

          {/* Footer Stats */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t p-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold">{totalPeople}</div>
                  <div className="text-xs text-muted-foreground">people</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">{totalSpots}</div>
                  <div className="text-xs text-muted-foreground">spots</div>
                </div>
              </div>
              
              {clustersLoading && (
                <Badge variant="outline" className="animate-pulse">
                  Updating...
                </Badge>
              )}
              
              {clustersError && (
                <Badge variant="destructive">
                  Error loading data
                </Badge>
              )}
            </div>
            
            <ClusterLegend clusters={filteredClusters} className="mt-3" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
