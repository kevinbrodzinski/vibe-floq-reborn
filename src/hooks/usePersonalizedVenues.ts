import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

const bucket = (n: number) => Math.round(n * 1e4) / 1e4; // 4 dp ≈ 11 m

export type PriceTier = '$' | '$$' | '$$$' | '$$$$';

export interface PersonalizedVenue {
  venue_id: string;
  name: string;
  distance_m: number;
  rating: number | null;
  categories: string[] | null;
  description: string | null;
  address: string | null;
  photo_url: string | null;
  live_count: number;
  price_tier: PriceTier;
  personalized_score: number;
}

export const usePersonalizedVenues = (
  lat: number | null,
  lng: number | null,
  options: {
    radius?: number;
    limit?: number;
    categories?: string[];
    maxPriceTier?: PriceTier;
    vibe?: string;
  } = {}
) => {
  const { user } = useAuth();
  const {
    radius = 1000,
    limit = 20,
    categories,
    maxPriceTier = '$$$$',
    vibe
  } = options;

  return useQuery<PersonalizedVenue[]>({
    enabled: lat !== null && lng !== null,
    queryKey: [
      'personalized-venues',
      lat && bucket(lat),
      lng && bucket(lng),
      radius,
      limit,
      user?.id,
      categories,
      maxPriceTier,
      vibe
    ],
    staleTime: 30_000,   // 30 seconds
    gcTime: 300_000,     // 5 minutes
    retry: 2,
    queryFn: async () => {
      if (lat == null || lng == null) return [];

      const { data, error } = await supabase.rpc('venues_within_radius', {
        p_lat: lat,
        p_lng: lng,
        p_radius_m: radius,
        p_limit: limit,
        p_profile_id: user?.id || null,
        p_categories: categories || null,
        p_price_tier_max: maxPriceTier ?? '$$$$',
        p_vibe: vibe || null
      });

      if (error) {
        console.error('Personalized venues fetch error:', error);
        throw new Error(error.message ?? 'Failed to fetch venues');
      }

      // Map the response to match our interface
      const venues: PersonalizedVenue[] = (data || []).map((venue: any) => ({
        venue_id: venue.venue_id,
        name: venue.name,
        distance_m: venue.distance_m,
        rating: venue.rating,
        categories: venue.categories,
        description: venue.description,
        address: venue.address,
        photo_url: venue.photo_url,
        live_count: venue.live_count,
        price_tier: venue.price_tier,
        personalized_score: venue.personalized_score
      }));

      return venues;
    }
  });
};