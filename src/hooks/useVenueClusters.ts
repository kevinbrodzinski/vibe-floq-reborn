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
  // For compatibility with existing field components
  geometry?: { coordinates: [number, number] };
  vibe?: string;
  name?: string;
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
      // Explicitly coerce to double precision-compatible JS numbers to avoid PostgREST overload ambiguity
      const westD = Number.isFinite(west) ? Number(west) : parseFloat(String(west));
      const southD = Number.isFinite(south) ? Number(south) : parseFloat(String(south));
      const eastD = Number.isFinite(east) ? Number(east) : parseFloat(String(east));
      const northD = Number.isFinite(north) ? Number(north) : parseFloat(String(north));

      const params = { west: westD, south: southD, east: eastD, north: northD } as const;

      // 1) Try canonical RPC first
      let data: any[] | null = null;
      let rpcError: any = null;
      try {
        const res = await supabase.rpc('get_venues_in_bbox', params);
        data = res.data as any[] | null;
        rpcError = res.error;
      } catch (e) {
        rpcError = e;
      }

      // 2) If ambiguity/404, fall back to direct table select with bbox filters
      if (rpcError && ((rpcError.code === 'PGRST203') || (rpcError.status === 404))) {
        const sel = await supabase
          .from('venues')
          .select('id,name,lat,lng,source,external_id,address,categories,rating,photo_url,updated_at,created_at,description,radius_m,slug')
          .gte('lng', westD)
          .lte('lng', eastD)
          .gte('lat', southD)
          .lte('lat', northD)
          .limit(1000);
        if (sel.error) {
          console.error('Fallback venues SELECT error:', sel.error);
          throw sel.error;
        }
        data = (sel.data ?? []) as any[];
      }

      if (rpcError && !data) {
        console.error('Error fetching venues:', rpcError);
        throw rpcError;
      }
      
      // The RPC or SELECT returns a simplified format, so we cast it properly
      return (data ?? []).map(item => ({
        id: item.id,
        name: item.name,
        lat: +item.lat,
        lng: +item.lng,
        source: item.source || 'manual',
        external_id: item.external_id || item.id,
        address: item.address || null,
        categories: item.categories || [],
        rating: item.rating || null,
        photo_url: item.photo_url || null,
        updated_at: item.updated_at || new Date().toISOString(),
        geom: null,
        vibe: (item as any).vibe || null,
        created_at: item.created_at || new Date().toISOString(),
        description: item.description || null,
        radius_m: item.radius_m || 100,
        slug: item.slug || null,
      } as Venue));
    },
    staleTime: 60_000, // Cache for 1 minute
    enabled: true,
  });

  // Use ref to persist supercluster index for performance
  const indexRef = useRef<Supercluster<any, any> | null>(null);

  // Create supercluster index and cluster venues
  const clusters = useMemo(() => {
    if (venues.length === 0) return [];

    // Create or reuse supercluster index
    if (!indexRef.current) {
      indexRef.current = new Supercluster<any, any>({
        radius: 60, // Cluster radius in pixels
        maxZoom: 18, // Maximum zoom level for clustering
        minZoom: 0,
        nodeSize: 64,
      });
    }

    const index = indexRef.current;

    // Convert venues to GeoJSON features
    const points = venues
      .filter(venue => Number.isFinite(+venue.lat) && Number.isFinite(+venue.lng))
      .map(venue => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [venue.lng, venue.lat],
        },
        properties: {
          id: venue.id,
          name: venue.name,
          vibe: (venue as any).vibe,
          source: (venue as any).source || 'database',
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
          geometry: { coordinates: [lng, lat] as [number, number] },
        };
      } else {
        // This is a single venue
        return {
          id: feature.properties.id,
          lat,
          lng,
          pointCount: 0,
          props: feature.properties,
          // Add compatibility fields
          geometry: { coordinates: [lng, lat] as [number, number] },
          vibe: feature.properties.vibe,
          name: feature.properties.name,
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