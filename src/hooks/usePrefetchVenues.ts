import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useGeo } from '@/hooks/useGeo';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to prefetch venue data in the background for better performance
 * This runs with low priority and doesn't block the UI
 */
export const usePrefetchVenues = () => {
  const queryClient = useQueryClient();
  const { coords } = useGeo();

  useEffect(() => {
    if (!coords) return;

    // Prefetch nearby venues with a larger radius for when user expands search
    const prefetchLargerRadius = async () => {
      const largerRadiusKey = ["nearby-venues", coords.lat, coords.lng, 5, [], 'any', 50];
      
      // Only prefetch if not already cached
      const existingData = queryClient.getQueryData(largerRadiusKey);
      if (existingData) return;

      // Use requestIdleCallback for low-priority prefetching
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          queryClient.prefetchQuery({
            queryKey: largerRadiusKey,
            queryFn: async () => {
              const { data, error } = await supabase.rpc('get_nearby_venues', {
                p_lat: coords.lat,
                p_lng: coords.lng,
                p_radius_m: 5000, // 5km radius
                p_limit: 50,
                p_any_tags: null,
                p_all_tags: null
              });
              if (error) throw error;
              return data ?? [];
            },
            staleTime: 5 * 60_000,
          });
        });
      }
    };

    // Prefetch trending venues for different radii
    const prefetchTrendingVariations = async () => {
      const trendingKey = ['trending', coords.lat, coords.lng, 3000, 15, [], 'any'];
      
      const existingTrending = queryClient.getQueryData(trendingKey);
      if (existingTrending) return;

      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          queryClient.prefetchQuery({
            queryKey: trendingKey,
            queryFn: async () => {
              const { data, error } = await supabase.rpc('get_trending_venues_enriched', {
                p_lat: coords.lat,
                p_lng: coords.lng,
                p_radius_m: 3000,
                p_limit: 15,
                p_any_tags: null,
                p_all_tags: null
              });
              if (error) throw error;
              return data ?? [];
            },
            staleTime: 5 * 60_000,
          });
        });
      }
    };

    // Delay prefetching to not interfere with initial load
    const prefetchTimer = setTimeout(() => {
      prefetchLargerRadius();
      prefetchTrendingVariations();
    }, 2000); // Wait 2 seconds after coordinates are available

    return () => clearTimeout(prefetchTimer);
  }, [coords, queryClient]);
};