import { supabase } from '@/integrations/supabase/client';

export type NearestVenue = {
  venue_id: string;
  name: string;
  distance_m: number;
  lat: number;
  lng: number;
};

export async function fetchNearestVenue(lat: number, lng: number, maxM = 150): Promise<NearestVenue | null> {
  const { data, error } = await supabase.rpc('rpc_nearest_venue', {
    in_lat: lat,
    in_lng: lng,
    in_max_distance_m: maxM,
  });
  
  if (error) return null;
  
  // rpc can return a single row or array depending on implementation; normalize
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  
  return {
    venue_id: row.venue_id,
    name: row.name,
    distance_m: row.distance_m,
    lat: row.lat ?? null,
    lng: row.lng ?? row.lon ?? null,
  };
}