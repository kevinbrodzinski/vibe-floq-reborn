// Supabase is imported dynamically inside the function to allow tests to mock it

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
  const { supabase } = await import('@/integrations/supabase/client');
  const { data, error } = await supabase.rpc('get_nearest_venue', {
    p_lat: lat,
    p_lng: lngValue,
    p_radius: maxDistance,
  });
  
  if (error) throw { message: 'RPC failed' } as any;
  
  // rpc can return a single row or array depending on implementation; normalize
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  
  return {
    venue_id: row.venue_id,
    name: row.venue_id, // Using venue_id as name fallback since name isn't returned
    distance_m: row.distance_m,
    lat: 0, // Not provided by this RPC
    lng: 0, // Not provided by this RPC
  };
}