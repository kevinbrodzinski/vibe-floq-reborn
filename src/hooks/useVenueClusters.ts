import { useMemo, useRef, useCallback } from 'react';
import Supercluster from 'supercluster';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useQuery } from '@tanstack/react-query';
import type { Viewport } from '@/utils/geoConversion';

type Venue = Database['public']['Tables']['venues']['Row'];

export interface VenueCluster {
  id: string | number;
  lat: number;
  lng: number;
  pointCount: number; // 0 = single venue, >0 = cluster
  props: Record<string, any>;
}

export interface ClusterVenue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  vibe: string;
  source: string;
}

/**
 * Hook for fetching and clustering venues within the current viewport
 */
export function useVenueClusters(viewport: Viewport) {
  const [west, south, east, north] = viewport.bounds;

  // Fetch venues within the current viewport bounds
  const { data: venues = [] } = useQuery({
    queryKey: ['venues', viewport.bounds],
    queryFn: async (): Promise<Venue[]> => {
      const { data, error } = await supabase.rpc('get_venues_in_bbox', {
        west,
        south,
        east,
        north,
      });
      
      if (error) {
        console.error('Error fetching venues:', error);
        throw error;
      }
      
      // The RPC returns a simplified format, so we cast it properly
      return (data as any[])?.map(item => ({
        id: item.id,
        name: item.name,
        lat: item.lat,
        lng: item.lng,
        vibe: item.vibe,
        source: item.source,
        created_at: null,
        geo: null,
      } as Venue)) ?? [];
    },
    staleTime: 60_000, // Cache for 1 minute
    enabled: true,
  });

  // Use ref to persist supercluster index for performance
  const indexRef = useRef<Supercluster<undefined, any> | null>(null);

  // Create supercluster index and cluster venues
  const clusters = useMemo(() => {
    if (venues.length === 0) return [];

    // Create or reuse supercluster index
    if (!indexRef.current) {
      indexRef.current = new Supercluster<undefined, any>({
        radius: 60, // Cluster radius in pixels
        maxZoom: 18, // Maximum zoom level for clustering
        minZoom: 0,
        nodeSize: 64,
      });
    }

    const index = indexRef.current;

    // Convert venues to GeoJSON features
    const points = venues.map(venue => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [venue.lng, venue.lat],
      },
      properties: {
        id: venue.id,
        name: venue.name,
        vibe: venue.vibe,
        source: venue.source,
      },
    }));

    // Load points into index
    index.load(points);

    // Get clusters for current viewport and zoom
    const clusterData = index.getClusters(
      viewport.bounds,
      Math.min(Math.round(viewport.zoom * 2), 18) // Map our 1-10 zoom to supercluster's range
    );

    // Convert to our cluster format with proper keys
    return clusterData.map((feature: any, index: number): VenueCluster => {
      const [lng, lat] = feature.geometry.coordinates;
      
      if (feature.properties.cluster) {
        // This is a cluster
        return {
          id: `cluster-${feature.properties.cluster_id}`,
          lat,
          lng,
          pointCount: feature.properties.point_count,
          props: {
            cluster: true,
            cluster_id: feature.properties.cluster_id,
            ...feature.properties,
          },
        };
      } else {
        // This is a single venue
        return {
          id: feature.properties.id,
          lat,
          lng,
          pointCount: 0,
          props: feature.properties,
        };
      }
    });
  }, [venues, viewport.bounds, viewport.zoom]);

  /** Get venues within a cluster (instant resolution using supercluster) */
  const getClusterVenues = useCallback(
    (clusterId: number): ClusterVenue[] => {
      if (!indexRef.current) return [];
      
      const leaves = indexRef.current.getLeaves(clusterId, Infinity);
      return leaves.map((leaf: any) => ({
        id: leaf.properties.id,
        name: leaf.properties.name,
        lat: leaf.geometry.coordinates[1],
        lng: leaf.geometry.coordinates[0],
        vibe: leaf.properties.vibe,
        source: leaf.properties.source,
      }));
    },
    []
  );

  return { clusters, getClusterVenues, supercluster: indexRef.current };
}