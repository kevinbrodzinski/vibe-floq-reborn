import { supabase } from '@/integrations/supabase/client';

export type NearestVenue = {
  venue_id: string;
  name: string;
  distance_m: number;
  lat: number;
  lng: number;
};

// Overload for object parameter
export async function fetchNearestVenue(params: { lat: number; lng: number; maxDistanceM?: number }): Promise<NearestVenue | null>;
// Overload for individual parameters  
export async function fetchNearestVenue(lat: number, lng: number, maxM?: number): Promise<NearestVenue | null>;
// Implementation
export async function fetchNearestVenue(latOrParams: number | { lat: number; lng: number; maxDistanceM?: number }, lng?: number, maxM = 150): Promise<NearestVenue | null> {
  // Handle both call signatures
  const lat = typeof latOrParams === 'number' ? latOrParams : latOrParams.lat;
  const lngValue = typeof latOrParams === 'number' ? lng! : latOrParams.lng;
  const maxDistance = typeof latOrParams === 'number' ? maxM : (latOrParams.maxDistanceM ?? 150);
  const { data, error } = await supabase.rpc('rpc_nearest_venue', {
    in_lat: lat,
    in_lng: lngValue,
    in_max_distance_m: maxDistance,
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