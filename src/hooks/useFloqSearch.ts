import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { FloqSearchFilters, FloqSearchResult } from '@/types/SearchFilters';

export function useFloqSearch(
  coords: { lat: number; lng: number } | null,
  filters: FloqSearchFilters,
  enabled = true
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['floq-search', coords, filters, user?.id],
    enabled: enabled && !!coords,
    staleTime: 30_000,
    queryFn: async () => {
      if (!coords) return [];

      const { data, error } = await supabase.rpc('search_floqs', {
        p_lat: coords.lat,
        p_lng: coords.lng,
        p_radius_km: filters.radiusKm ?? 25,
        p_query: filters.query,
        p_vibe_ids: filters.vibes as any,
        p_time_from: filters.timeRange[0].toISOString(),
        p_time_to: filters.timeRange[1].toISOString(),
        p_limit: 200,
        // _viewer_id: user?.id || null, // commented out - not in current RPC signature
      }).returns<any[]>();

      if (error) throw error;
      return (data ?? []).map(floq => ({
        ...floq,
        distance_m: (floq as any).distance_m || 0, // Add missing distance_m field
        friends_going_count: (floq as any).friends_going_count || 0,
        friends_going_avatars: (floq as any).friends_going_avatars || [],
        friends_going_names: (floq as any).friends_going_names || [],
        friendsGoing: {
          count: (floq as any).friends_going_count || 0,
          avatars: (floq as any).friends_going_avatars || [],
          names: (floq as any).friends_going_names || [],
        },
      })) as FloqSearchResult[];
    },
    placeholderData: (prev) => prev ?? [],
  });
}