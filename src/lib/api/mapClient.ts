import { supabase } from '@/integrations/supabase/client';
import type {
  ViewportInput, TileVenuesResponse, VenueDetailResponse, SocialWeatherResponse
} from './mapContracts';

export async function fetchTileVenues(vp: ViewportInput): Promise<TileVenuesResponse> {
  const { data, error } = await supabase.functions.invoke<TileVenuesResponse>('venues-tile', { body: vp });
  if (error) throw new Error(error.message);
  return data as TileVenuesResponse;
}

export async function fetchVenueDetail(pid: string): Promise<VenueDetailResponse> {
  const { data, error } = await supabase.functions.invoke<VenueDetailResponse>('venue-detail', { body: { pid } });
  if (error) throw new Error(error.message);
  return data as VenueDetailResponse;
}

export async function fetchSocialWeather(vp: ViewportInput): Promise<SocialWeatherResponse> {
  const { data, error } = await supabase.functions.invoke<SocialWeatherResponse>('social-weather', { body: vp });
  if (error) throw new Error(error.message);
  return data as SocialWeatherResponse;
}