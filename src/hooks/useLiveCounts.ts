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

      const { data, error } = await supabase
        .from('vibes_now')
        .select('venue_id')
        .in('venue_id', venueIds)
        .gt('expires_at', 'now()')
        .not('venue_id', 'is', null);

      if (error) {
        console.error('Error fetching live counts:', error);
        return {};
      }

      // Count occurrences of each venue_id
      const liveCounts: Record<string, number> = {};
      data?.forEach(item => {
        if (item.venue_id) {
          liveCounts[item.venue_id] = (liveCounts[item.venue_id] || 0) + 1;
        }
      });

      return liveCounts;
    },
    enabled: venueIds.length > 0,
    staleTime: 30_000, // 30 seconds - live counts change frequently
    gcTime: 60_000, // 1 minute garbage collection
  });
}