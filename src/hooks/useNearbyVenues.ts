import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type FilterLogic = 'any' | 'all';

export type NearbyVenueRow = {
  id: string;
  name: string;
  distance_m: number | string; // PostgREST can return numeric as string
  lat: number | null;
  lng: number | null;
  categories: string[] | null;
  provider: string | null;
  photo_url: string | null;
  vibe_tag: string | null;
  vibe_score: number | null;
  live_count: number | null;
  canonical_tags: string[] | null;
};

type Options = {
  radiusKm?: number;      // default 0.5 km
  limit?: number;         // default 25
  pillKeys?: string[];    // UI pill keys
  filterLogic?: FilterLogic; // 'any' | 'all'
};

export function useNearbyVenues(
  lat: number,
  lng: number,
  opts: Options = {}
) {
  const {
    radiusKm = 0.5,
    limit = 25,
    pillKeys = [],
    filterLogic = 'any',
  } = opts;

  const radiusM = Math.max(1, Math.round(radiusKm * 1000));
  const anyTags = filterLogic === 'any' && pillKeys.length ? pillKeys : null;
  const allTags = filterLogic === 'all' && pillKeys.length ? pillKeys : null;

  return useQuery<NearbyVenueRow[]>({
    queryKey: [
      'nearby-venues',
      Number(lat.toFixed(6)),
      Number(lng.toFixed(6)),
      radiusM,
      limit,
      filterLogic,
      pillKeys.join('|'),
    ],
    enabled: Number.isFinite(lat) && Number.isFinite(lng) && radiusM > 0,
    queryFn: async () => {
      // Preferred: 6-arg RPC (limit included)
      let { data, error } = await supabase.rpc('get_nearby_venues', {
        p_lat: lat,
        p_lng: lng,
        p_radius_m: radiusM,
        p_limit: limit,
        p_any_tags: anyTags,
        p_all_tags: allTags,
      });

      // Safety net: if this instance only has the 5-arg version, retry without p_limit.
      if (error && /does not exist|too many arguments|mismatch/i.test(error.message)) {
        const retry = await supabase.rpc('get_nearby_venues', {
          p_lat: lat,
          p_lng: lng,
          p_radius_m: radiusM,
          p_any_tags: anyTags,
          p_all_tags: allTags,
        });
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      return (data ?? []) as NearbyVenueRow[];
    },
    staleTime: 30_000,
  });
}