
import { useState, useEffect, useCallback, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl';
import { Badge } from '@/components/ui/badge';
import { MapErrorBoundary } from './MapErrorBoundary';
import { ClusterLegend } from './ClusterLegend';
import { VibeFilterPanel } from './VibeFilterPanel';
import { createDensityLayer, usePulseLayer } from './DeckLayers';
import { useClusters } from '@/hooks/useClusters';
import { useClustersLive } from '@/hooks/useClustersLive';
import { useVibeFilter } from '@/hooks/useVibeFilter';
import { useOptimizedGeolocation } from '@/hooks/useOptimizedGeolocation';
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
}

export function VibeDensityMap({ open, onOpenChange }: VibeDensityMapProps) {
  const { lat, lng, loading: locationLoading, error: locationError } = useOptimizedGeolocation();
  const [vibeFilter, vibeFilterHelpers] = useVibeFilter();

  // Calculate viewport from user location
  const initialViewState = useMemo(() => ({
    latitude: lat || 40.7128,
    longitude: lng || -74.0060,
    zoom: 12,
    pitch: 0,
    bearing: 0
  }), [lat, lng]);

  // Fetch clusters
  const { 
    data: clusters = [], 
    isLoading: clustersLoading, 
    error: clustersError,
    refetch: refetchClusters 
  } = useClusters(lat, lng);

  // Live updates
  useClustersLive(clusters, () => {}, refetchClusters);

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

  if (locationError) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="top" className="h-full">
          <SheetHeader>
            <SheetTitle>Vibe Density Map</SheetTitle>
          </SheetHeader>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground">Unable to access location</p>
              <p className="text-sm text-muted-foreground mt-2">{locationError}</p>
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
            {locationLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                  <p className="text-muted-foreground">Getting your location...</p>
                </div>
              </div>
            ) : (
              <MapErrorBoundary>
                <DeckGL
                  initialViewState={initialViewState}
                  controller={true}
                  layers={layers}
                  style={{ position: 'relative', width: '100%', height: '100%' }}
                >
                  <Map
                    mapboxAccessToken={MAPBOX_TOKEN}
                    mapStyle={MAP_STYLE}
                    style={{ width: '100%', height: '100%' }}
                  />
                </DeckGL>
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
            
            <ClusterLegend className="mt-3" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
