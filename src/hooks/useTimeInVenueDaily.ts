import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTimeInVenueDaily(venue_id?: string, day?: string) {
  return useQuery({
    queryKey: ['time-in-venue-daily', venue_id, day],
    enabled: !!venue_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!venue_id) return [];
      
      let query = supabase
        .from('v_time_in_venue_daily')
        .select('*')
        .eq('venue_id', venue_id as any);
      
      if (day) {
        query = query.eq('day', day as any);
      }
      
      const { data, error } = await query.order('day', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
}

export async function getTimeInVenueDaily(venue_id: string, day?: string) {
  let query = supabase
    .from('v_time_in_venue_daily')
    .select('*')
    .eq('venue_id', venue_id as any);
  
  if (day) {
    query = query.eq('day', day as any);
  }
  
  const { data, error } = await query.order('day', { ascending: false });
  if (error) throw error;
  return data;
}