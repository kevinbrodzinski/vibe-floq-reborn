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
  const { data, error } = await supabase.rpc('get_live_activity',
    { p_cursor: cursor ?? null, p_limit: limit });
  if (error) throw error;
  return data as PulseEvent[];
};

/* trending venues near user */
export const fetchTrendingVenues = async (lat: number, lng: number,
                                          radius = 2000, limit = 5) => {
  const { data, error } = await supabase.rpc('get_trending_venues',
    { p_user_lat: lat, p_user_lng: lng, p_radius_m: radius, p_limit: limit });
  if (error) throw error;
  return data as TrendingVenue[];
}; 