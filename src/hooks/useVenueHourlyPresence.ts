import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useVenueHourlyPresence(venue_id?: string, hours?: number) {
  return useQuery({
    queryKey: ['venue-hourly-presence', venue_id, hours],
    enabled: !!venue_id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    queryFn: async () => {
      if (!venue_id) return [];
      
      let query = supabase
        .from('venue_hourly_presence')
        .select('*')
        .eq('venue_id', venue_id as any);
      
      if (hours) {
        // Get last N hours
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - hours);
        query = query.gte('hour_ts', cutoff.toISOString());
      }
      
      const { data, error } = await query.order('hour_ts', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
}

export async function getVenueHourlyPresence(venue_id: string, hours?: number) {
  let query = supabase
    .from('venue_hourly_presence')
    .select('*')
    .eq('venue_id', venue_id as any);
  
  if (hours) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    query = query.gte('hour_ts', cutoff.toISOString());
  }
  
  const { data, error } = await query.order('hour_ts', { ascending: false });
  if (error) throw error;
  return data;
}