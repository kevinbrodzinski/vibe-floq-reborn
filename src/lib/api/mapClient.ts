import { supabase } from '@/integrations/supabase/client';
import type {
  ViewportInput, TileVenuesResponse, VenueDetailResponse, SocialWeatherResponse
} from './mapContracts';

export async function fetchTileVenues(vp: ViewportInput): Promise<TileVenuesResponse> {
  const { data, error } = await supabase.functions.invoke('venues-tile', {
    body: vp,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchVenueDetail(pid: string): Promise<VenueDetailResponse> {
  const { data, error } = await supabase.functions.invoke('venue-detail', {
    body: { pid },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchSocialWeather(vp: ViewportInput): Promise<SocialWeatherResponse> {
  const { data, error } = await supabase.functions.invoke('social-weather', {
    body: vp,
  });
  if (error) throw new Error(error.message);
  return data;
}