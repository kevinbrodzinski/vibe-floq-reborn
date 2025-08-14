import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type FilterLogic = 'any' | 'all';

export type TrendingVenueRow = {
  venue_id: string;
  name: string;
  distance_m: number | string;
  people_now: number | null;
  visits_15m: number | null;
  trend_score: number | null;
  last_seen_at: string | null; // timestamptz
  provider: string | null;
  categories: string[] | null;
  vibe_tag: string | null;
  vibe_score: number | null;
  live_count: number | null;
  photo_url: string | null;
  canonical_tags: string[] | null;
};

type Options = {
  radiusM?: number;        // default 2000
  limit?: number;          // default 10
  pillKeys?: string[];
  filterLogic?: FilterLogic;
};

export function useTrendingVenues(
  lat: number,
  lng: number,
  opts: Options = {}
) {
  const {
    radiusM = 2000,
    limit = 10,
    pillKeys = [],
    filterLogic = 'any',
  } = opts;

  const anyTags = filterLogic === 'any' && pillKeys.length ? pillKeys : null;
  const allTags = filterLogic === 'all' && pillKeys.length ? pillKeys : null;

  return useQuery<TrendingVenueRow[]>({
    queryKey: [
      'trending',
      Number(lat.toFixed(6)),
      Number(lng.toFixed(6)),
      radiusM,
      limit,
      filterLogic,
      pillKeys.join('|'),
    ],
    enabled: Number.isFinite(lat) && Number.isFinite(lng) && radiusM > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_trending_venues_enriched', {
        p_lat: lat,
        p_lng: lng,
        p_radius_m: radiusM,
        p_limit: limit,
        p_any_tags: anyTags,
        p_all_tags: allTags,
      });
      if (error) throw error;
      return (data ?? []) as TrendingVenueRow[];
    },
    staleTime: 30_000,
  });
}