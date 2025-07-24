import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useEncounterHeat() {
  return useQuery({
    queryKey: ['heat'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_encounter_heat')
        .select('venue_id, hits, geom');
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: false,
    staleTime: 15 * 60 * 1000,
  });
}