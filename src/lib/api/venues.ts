import { supabase } from '@/integrations/supabase/client';

export type VenueSnapshot = {
  venue_id: string;
  name: string;
  distance_m: number;
  vibe_tag: string | null;
  trend_score: number;
  people_now: number;
  last_seen_at?: string;
  dominant_vibe?: string | null;
  updated_at?: string;
};

/* ---------- 1. fast list for map / trending ---------- */
export async function fetchTrendingVenues(
  lat: number,
  lng: number,
  radiusM = 2_000,
  limit = 15
): Promise<VenueSnapshot[]> {
  const { data, error } = await supabase.rpc('get_trending_venues', {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
    p_limit: limit
  });

  if (error) throw error;
  return (data ?? []) as VenueSnapshot[];
}

/* ---------- 2. single venue live counter ---------- */
export async function fetchVenueSnapshot(venueId: string) {
  const { data, error } = await supabase
    .from('venue_presence_snapshot')
    .select('*')
    .eq('venue_id', venueId)
    .single();

  if (error) throw error;
  return data;
}