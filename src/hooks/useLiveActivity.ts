import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase }         from '@/integrations/supabase/client';
import type { PulseEvent }  from '@/types/pulse';

export const useLiveActivity = (lat: number, lng: number, radius_km = 1) => {
  return useInfiniteQuery<PulseEvent[]>({
    queryKey: ['live_activity', lat, lng, radius_km],
    initialPageParam: null,
    queryFn: async ({ pageParam = null }) => {
      const { data, error } = await supabase
        .rpc('get_live_activity', {
          p_radius_km: radius_km,
          p_lat: lat,
          p_lng: lng,
        });

      if (error) throw error;
      
      // Transform the data to match PulseEvent structure
      return (data || []).map((item: any) => ({
        id: item.venue_id || `live_${Date.now()}_${Math.random()}`,
        type: 'live_activity',
        venue_id: item.venue_id,
        people_now: item.people_now,
        vibe_tag: item.vibe_tag,
        timestamp: new Date().toISOString(),
      })) as PulseEvent[];
    },
    getNextPageParam: () => undefined, // No pagination for live activity
    staleTime: 30_000, // 30 seconds
    enabled: Boolean(lat && lng),
  });
};