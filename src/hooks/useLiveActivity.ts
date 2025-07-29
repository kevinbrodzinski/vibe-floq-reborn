import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGeo } from '@/hooks/useGeo';
import type { PulseEvent } from '@/types/pulse';

export const useLiveActivity = (lat?: number, lng?: number, radiusKm = 2) => {
  const { coords } = useGeo();
  const actualLat = lat ?? coords?.latitude;
  const actualLng = lng ?? coords?.longitude;

  return useInfiniteQuery({
    queryKey: ['live_activity', actualLat, actualLng, radiusKm],
    initialPageParam: null,
    getNextPageParam: () => undefined,
    enabled: Boolean(actualLat && actualLng),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_live_activity' as any, {
        p_radius_km: radiusKm,
        p_lat: actualLat!,
        p_lng: actualLng!,
      });
      if (error) throw error;
      return (data ?? []) as PulseEvent[];
    },
    staleTime: 30_000,
  });
};