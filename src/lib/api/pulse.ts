import { supabase } from '@/integrations/supabase/client';
import type { PulseEvent, TrendingVenue } from '@/types/pulse';

/* record one event via edge fn */
export const recordPulseEvent = async (payload: Partial<PulseEvent>) => {
  const { data, error } = await supabase.functions.invoke('record_pulse_event', { body: payload });
  if (error) throw error;
  return data;
};

/* paginated live-activity feed */
export const fetchLiveActivity = async (cursor?: number, limit = 30) => {
  const { data } = await supabase.rpc('get_live_activity',
    { p_radius_km: 5, p_lat: 0, p_lng: 0 }).throwOnError();
  return data as unknown as PulseEvent[];
};

/* trending venues near user */
export const fetchTrendingVenues = async (lat: number, lng: number,
                                          radius = 2000, limit = 5) => {
  const { data } = await supabase.rpc('get_trending_venues' as any,
    { p_lat: lat, p_lng: lng, p_radius_m: radius, p_limit: limit }).throwOnError();
  return data as TrendingVenue[];
};

/* fetch nearby venues with new signature */
export async function fetchNearbyVenues(lat: number, lng: number, radiusKm = 2) {
  const { data } = await supabase
    .rpc('get_nearby_venues', { p_lat: lat, p_lng: lng, p_radius: radiusKm * 1000, p_limit: 30 }).throwOnError();
  return data;
}