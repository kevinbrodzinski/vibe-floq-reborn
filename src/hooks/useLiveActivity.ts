import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGeo } from '@/hooks/useGeo';
import type { PulseEvent } from '@/types/pulse';

export const useLiveActivity = (lat?: number, lng?: number, radiusKm = 2) => {
  const { coords } = useGeo();
  const actualLat = lat ?? coords?.lat;
  const actualLng = lng ?? coords?.lng;

  return useQuery({
    queryKey: ['live_activity', actualLat, actualLng, radiusKm],
    enabled: Boolean(actualLat && actualLng),
    queryFn: async () => {
      const { data } = await supabase.rpc('get_live_activity', {
        p_radius_km: radiusKm,
        p_lat: actualLat!,
        p_lng: actualLng!,
      }).throwOnError();
      
      return (data ?? []) as unknown as PulseEvent[];
    },
    staleTime: 30_000,
  });
};