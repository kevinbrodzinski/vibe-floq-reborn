import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePulseBadges = (profileId?: string) =>
  useQuery({
    queryKey: ['pulse-badges', profileId],
    enabled : !!profileId,
    queryFn : async () => {
      const [{ data: f }] = await supabase
        .from('v_active_floqs_nearby')
        .select('active_floqs')
        .eq('profile_id', profileId!)
        .limit(1);

      const [{ data: v }] = await supabase
        .from('v_today_venue_discoveries')
        .select('venues_discovered')
        .eq('profile_id', profileId!)
        .limit(1);

      return {
        activeFloqs      : f?.active_floqs ?? 0,
        venuesDiscovered : v?.venues_discovered ?? 0
      };
    },
    staleTime: 60_000
  }); 