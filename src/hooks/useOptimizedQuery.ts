import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OptimizedQueryOptions<T = unknown> {
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  retry?: number | boolean;
  enabled?: boolean;
}

export function useOptimizedQuery<T>(
  key: string[],
  queryFn: () => Promise<T>,
  options?: OptimizedQueryOptions<T>
) {
  return useQuery({
    queryKey: key,
    queryFn,
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes
    gcTime: options?.cacheTime ?? 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    retry: options?.retry ?? 3,
    enabled: options?.enabled
  });
}

// Optimized venue queries with proper caching
export function useOptimizedVenueQuery(venueId: string) {
  return useOptimizedQuery(
    ['venue', venueId],
    async () => {
      const { data, error } = await supabase
        .from('venues')
        .select(`
          id, name, description, popularity,
          location, live_count, vibe_score,
          created_at, updated_at
        `)
        .eq('id', venueId)
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for venues
      cacheTime: 15 * 60 * 1000 // 15 minutes
    }
  );
}

// Optimized presence queries
export function useOptimizedPresenceQuery(profileId?: string) {
  return useOptimizedQuery(
    ['presence', profileId],
    async () => {
      if (!profileId) return null;
      
      const { data, error } = await supabase
        .from('vibes_now')
        .select('profile_id, vibe, visibility, updated_at')
        .eq('profile_id', profileId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    {
      staleTime: 30 * 1000, // 30 seconds for presence
      cacheTime: 2 * 60 * 1000, // 2 minutes
      enabled: !!profileId
    }
  );
}

// Batch query optimizer for multiple items
export function useBatchQuery<T>(
  baseKey: string,
  ids: string[],
  batchFn: (ids: string[]) => Promise<T[]>,
  options?: OptimizedQueryOptions<T[]>
) {
  return useOptimizedQuery(
    [baseKey, 'batch', ...ids.sort()],
    () => batchFn(ids),
    {
      enabled: ids.length > 0,
      ...options
    }
  );
}