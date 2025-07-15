import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FloqSearchFilters, FloqSearchResult } from '@/types/SearchFilters';

export function useFloqSearch(
  coords: { lat: number; lng: number } | null,
  filters: FloqSearchFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['floq-search', coords, filters],
    enabled: enabled && !!coords,
    staleTime: 60_000,
    queryFn: async () => {
      if (!coords) return [];

      const { data, error } = await supabase.rpc('search_floqs', {
        p_lat: coords.lat,
        p_lng: coords.lng,
        p_radius_km: filters.radiusKm,
        p_query: filters.query,
        p_vibe_ids: filters.vibes,
        p_time_from: filters.timeRange[0].toISOString(),
        p_time_to: filters.timeRange[1].toISOString(),
        p_limit: 200,
      });

      if (error) throw error;
      return (data ?? []) as FloqSearchResult[];
    },
    placeholderData: (prev) => prev ?? [],
  });
}