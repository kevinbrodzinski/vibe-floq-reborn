
import React from "react";
import DeckGL from "@deck.gl/react";
import { ClusterLegend } from "@/components/map/ClusterLegend";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { VibeFilterPanel } from "@/components/map/VibeFilterPanel";
import { toast } from "sonner";
import { createDensityLayer, usePulseLayer } from "@/components/map/DeckLayers";
import { useGeolocation } from "@/hooks/useGeolocation";

import { useClusters } from "@/hooks/useClusters";
import { useVibeFilter } from "@/hooks/useVibeFilter";
import { motion } from "framer-motion";
import Map from "react-map-gl";
import { supabase } from "@/integrations/supabase/client";
import type { Cluster } from "@/hooks/useClusters";
import { useEffect, useMemo, useState } from "react";

interface VibeDensityMapProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  userLocation?: { lat: number; lng: number };
  onClusterClick?: (cluster: Cluster) => void;
}

export const VibeDensityMap: React.FC<VibeDensityMapProps> = ({
  open,
  onOpenChange,
  userLocation: propUserLocation,
  onClusterClick,
}) => {
  const { lat: userLat, lng: userLng } = useGeolocation();
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  
  // Load Mapbox token on mount
  useEffect(() => {
    const loadToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          console.warn('No Mapbox token returned from edge function');
        }
      } catch (error) {
        console.error('Failed to load Mapbox token:', error);
        toast.error('Failed to load map');
      } finally {
        setTokenLoading(false);
      }
    };
    
    loadToken();
  }, []);

  const userLocation = useMemo(() => ({
    lat: propUserLocation?.lat || userLat || 34.052234,
    lng: propUserLocation?.lng || userLng || -118.243685,
  }), [propUserLocation?.lat, propUserLocation?.lng, userLat, userLng]);

  const [viewport, setViewport] = useState({
    longitude: userLocation.lng,
    latitude: userLocation.lat,
    zoom: 11,
    pitch: 0,
    bearing: 0,
  });

  // Update viewport when user location changes
  useEffect(() => {
    setViewport(prev => ({
      ...prev,
      longitude: userLocation.lng,
      latitude: userLocation.lat,
    }));
  }, [userLocation.lng, userLocation.lat]);

  const initialView = {
    longitude: viewport.longitude,
    latitude: viewport.latitude,
    zoom: viewport.zoom,
    pitch: viewport.pitch,
    bearing: viewport.bearing,
  };

  // Vibe filter state
  const [vibeFilter, vibeHelpers] = useVibeFilter();

  // Calculate bounds for clustering
  const bounds = useMemo(() => {
    const DEGREE_OFFSET = 0.05; // ~5.5km at equator
    return [
      viewport.longitude - DEGREE_OFFSET, // minLng
      viewport.latitude - DEGREE_OFFSET,  // minLat
      viewport.longitude + DEGREE_OFFSET, // maxLng
      viewport.latitude + DEGREE_OFFSET,  // maxLat
    ] as [number, number, number, number];
  }, [viewport.latitude, viewport.longitude]);

  // Fetch clusters for current viewport
  const { clusters, loading, error } = useClusters(bounds, 6);

  // Filter clusters based on vibe preferences
  const filteredClusters = useMemo(() => {
    return clusters.filter(cluster => {
      if (!cluster.vibe_counts) return true;
      return Object.keys(cluster.vibe_counts).some(vibe => vibeFilter[vibe as keyof typeof vibeFilter]);
    });
  }, [clusters, vibeFilter]);

  // Convert vibe filter to prefs format
  const vibePrefs = useMemo(() => {
    const prefs: Record<string, number> = {};
    Object.keys(vibeFilter).forEach(vibe => {
      prefs[vibe] = vibeFilter[vibe as keyof typeof vibeFilter] ? 1 : 0;
    });
    return prefs;
  }, [vibeFilter]);

  // Create DeckGL layers
  const densityLayer = useMemo(() => {
    if (!filteredClusters.length) return null;
    
    const handleClusterClick = (cluster: Cluster) => {
      onClusterClick?.(cluster);
      toast.success(`${cluster.total} people vibing here!`);
    };

    return createDensityLayer(filteredClusters, vibePrefs, handleClusterClick);
  }, [filteredClusters, vibePrefs, onClusterClick]);

  const pulseLayer = usePulseLayer(filteredClusters, vibePrefs);

  const layers = useMemo(() => {
    return [densityLayer, pulseLayer].filter(Boolean);
  }, [densityLayer, pulseLayer]);

  const handleViewStateChange = (evt: any) => {
    setViewport(evt.viewState);
  };

  // Show loading state while token is loading
  if (tokenLoading) {
    return (
      <div className="relative w-full h-full bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-20 flex gap-3">
        <VibeFilterPanel value={vibeFilter} onChange={vibeHelpers.replace} />
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20">
        <ClusterLegend clusters={filteredClusters} />
      </div>

      {/* Loading overlay */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-30 bg-background/80 backdrop-blur-sm flex items-center justify-center"
        >
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading vibes...</p>
          </div>
        </motion.div>
      )}

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 bg-destructive/10 border border-destructive/20 rounded-lg p-4"
        >
          <p className="text-destructive text-sm">
            Failed to load vibe data: {error}
          </p>
        </motion.div>
      )}

      {/* Map Container */}
      <div className="absolute inset-0">
        <MapErrorBoundary>
          <div className="absolute inset-0">
            {/* Interactive Mapbox map or fallback */}
            {mapboxToken ? (
              <Map
                mapboxAccessToken={mapboxToken}
                initialViewState={initialView}
                onMove={handleViewStateChange}
                reuseMaps
                mapStyle="mapbox://styles/floq-prod-2025/floq-density-dark"
                attributionControl={false}
                interactive={false}
                style={{ position: 'absolute', inset: "0" }}
              />
            ) : (
              /* Fallback static image */
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url("https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${userLocation.lng},${userLocation.lat},12,0/600x400@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw")`,
                }}
              />
            )}
            
            {/* DeckGL overlay will be added later once types are resolved */}
          </div>
        </MapErrorBoundary>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 z-20 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm">
        <span className="text-muted-foreground">
          {filteredClusters.length} vibe clusters
        </span>
      </div>
    </div>
  );
};
