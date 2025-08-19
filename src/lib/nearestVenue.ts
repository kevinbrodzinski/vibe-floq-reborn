import { supabase } from '@/integrations/supabase/client';

export type NearestVenue = {
  venue_id: string;
  name: string;
  distance_m: number;
  lat: number;
  lng: number;
};

export async function fetchNearestVenue(opts: { 
  lat: number; 
  lng: number; 
  maxDistanceM?: number 
}): Promise<NearestVenue | null> {
  const { lat, lng, maxDistanceM = 200 } = opts;
  
  const { data, error } = await supabase.rpc('rpc_nearest_venue', {
    in_lat: lat,
    in_lng: lng,
    in_max_distance_m: maxDistanceM,
  });

  if (error) throw error;
  const row = (data as any[] | null)?.[0];
  return row ? (row as NearestVenue) : null;
}