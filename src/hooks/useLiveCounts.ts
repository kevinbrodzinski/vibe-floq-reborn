import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for batch-fetching live counts for multiple venues
 * Returns a map of venue_id -> live_count for efficient lookups
 */
export function useLiveCounts(venueIds: string[]) {
  return useQuery({
    queryKey: ['live-counts', venueIds.sort()], // Sort for consistent cache keys
    queryFn: async (): Promise<Record<string, number>> => {
      if (venueIds.length === 0) return {};

      // Note: This hook needs to be refactored since live_positions doesn't have venue_id
      // For now, return empty counts until venue integration is added to live_positions
      console.warn('useLiveCounts: venue_id not available in live_positions table yet');
      return {};
    },
    enabled: venueIds.length > 0,
    staleTime: 30_000, // 30 seconds - live counts change frequently
    gcTime: 60_000, // 1 minute garbage collection
  });
}