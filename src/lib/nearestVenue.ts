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
  
  if (error) throw error;
  
  // rpc returns an array or null
  if (!data || data.length === 0) return null;
  
  const venue = data[0]; // Get first result
  return {
    venue_id: venue.venue_id,
    name: 'Unknown Venue', // name not available in RPC response
    distance_m: venue.distance_m,
    lat: lat, // use original coordinates as fallback
    lng: lngValue,
  };
}