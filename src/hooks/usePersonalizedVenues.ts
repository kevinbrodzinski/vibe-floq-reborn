import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const bucket = (n: number) => Math.round(n * 1e4) / 1e4; // ~11 m

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
  live_count: number | null;
  price_tier: PriceTier | null;
  personalized_score: number | null;
  reason?: string | null; // from LLM re-rank (optional)
}

type Options = {
  radius?: number;
  limit?: number;
  categories?: string[];
  maxPriceTier?: PriceTier;
  vibe?: string;
  tags?: string[];              // optional tag filters for LLM rerank
  useLLM?: boolean;             // toggle rerank
  llmTopK?: number;             // how many candidates to rerank
  tz?: string;                  // timezone override
};

export const usePersonalizedVenues = (
  lat: number | null,
  lng: number | null,
  options: Options = {}
) => {
  const { user } = useAuth();
  const {
    radius = 1000,
    limit = 20,
    categories,
    maxPriceTier = '$$$$',
    vibe,
    tags,
    useLLM = false,
    llmTopK = 30,
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone
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
      vibe,
      tags,
      useLLM ? 'llm' : 'base'
    ],
    staleTime: 30_000,
    gcTime: 300_000,
    retry: 2,
    queryFn: async () => {
      if (lat == null || lng == null) return [];

      // Prefer the new recommend function when LLM is requested
      if (useLLM) {
        try {
          const { data, error } = await supabase.functions.invoke('recommend', {
            body: {
              profileId: user?.id ?? null,
              lat,
              lng,
              radiusM: radius,
              limit,
              vibe,
              tags,
              tz,
              useLLM: true,
              llmTopK,
              ab: 'ui+llm',
            },
          });

          if (!error && data?.items) {
            const items = (data?.items ?? []) as any[];
            return items.map((v) => ({
              venue_id: v.venue_id,
              name: v.name,
              distance_m: v.distance_m,
              rating: v.rating ?? null,
              categories: v.categories ?? null,
              description: v.description ?? null,
              address: v.address ?? null,
              photo_url: v.photo_url ?? null,
              live_count: v.live_count ?? null,
              price_tier: (v.price_tier as PriceTier) ?? null,
              personalized_score: v.score ?? v.personalized_score ?? null,
              reason: v.reason ?? null
            }));
          }
          
          // Fall through to RPC if edge function fails
          console.warn('Edge function failed, falling back to RPC:', error);
        } catch (err) {
          console.warn('Edge function error, falling back to RPC:', err);
        }
      }

      // Baseline: keep your existing RPC (DB-scored)
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
      if (error) throw new Error(error.message ?? 'venues_within_radius failed');

      return (data || []).map((venue: any) => ({
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
        personalized_score: venue.personalized_score,
      }));
    }
  });
};

// Keep the remaining existing hooks for backwards compatibility
export function usePersonalizedVenuesRPC(params: {
  lat: number;
  lng: number;
  vibe?: string;
  tags?: string[];
  radiusM?: number;
  limit?: number;
}) {
  const { user } = useAuth();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';

  return useQuery({
    queryKey: ['personalizedVenuesRPC', { ...params, tz, profileId: user?.id }],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('get_personalized_recs', {
        p_profile_id: user.id,
        p_lat: params.lat,
        p_lng: params.lng,
        p_vibe: params.vibe ?? null,
        p_tags: params.tags ?? null,
        p_radius_m: params.radiusM ?? 3000,
        p_limit: params.limit ?? 20,
        p_tz: tz,
        p_ab: 'baseline',
        p_log: false, // Don't log on base RPC - use verbose RPC for logging
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTrackInteraction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';

  return useMutation({
    mutationFn: async ({ 
      venue_id, 
      interaction_type, 
      context 
    }: { 
      venue_id: string; 
      interaction_type: string;
      context?: { lat?: number; lng?: number; vibe?: string; radius_m?: number };
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const strongSignals = ['like', 'bookmark', 'check_in', 'plan', 'dismiss', 'dislike'];
      
      if (strongSignals.includes(interaction_type)) {
        // Call on_interaction Edge Function for strong signals
        const { data, error } = await supabase.functions.invoke('on_interaction', {
          body: {
            profile_id: user.id,
            venue_id,
            interaction_type,
            context: {
              lat: context?.lat,
              lng: context?.lng,
              tz,
              vibe: context?.vibe,
              radius_m: context?.radius_m || 3000,
              ...context
            }
          }
        });

        if (error) throw error;
        return data;
      } else {
        // Call track_interaction RPC for weak signals (view, etc.)
        const { data, error } = await supabase.rpc('track_interaction', {
          p_profile_id: user.id,
          p_venue_id: venue_id,
          p_interaction_type: interaction_type,
          p_context: context || {}
        });

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['personalizedVenues'] });
      queryClient.invalidateQueries({ queryKey: ['personalizedVenuesRPC'] });
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    }
  });
}

export function useUpdateUserTastes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tastes: {
      preferred_cuisines?: string[];
      disliked_cuisines?: string[];
      preferred_tags?: string[];
      disliked_tags?: string[];
      price_min?: number;
      price_max?: number;
      max_distance_km?: number;
      open_now_only?: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('upsert_user_tastes', {
        p_profile_id: user.id,
        p_preferred_cuisines: tastes.preferred_cuisines ?? null,
        p_disliked_cuisines: tastes.disliked_cuisines ?? null,
        p_preferred_tags: tastes.preferred_tags ?? null,
        p_disliked_tags: tastes.disliked_tags ?? null,
        p_price_min: tastes.price_min ?? null,
        p_price_max: tastes.price_max ?? null,
        p_max_distance_km: tastes.max_distance_km ?? null,
        p_open_now_only: tastes.open_now_only ?? null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate recommendation queries to get fresh results
      queryClient.invalidateQueries({ queryKey: ['personalizedVenues'] });
      queryClient.invalidateQueries({ queryKey: ['personalizedVenuesRPC'] });
    }
  });
}

export function useTrainUserModel() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      lookback_days?: number;
      top_k?: number;
      engage_window_min?: number;
    } = {}) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('train_user_model', {
        body: {
          profile_id: user.id,
          lookback_days: params.lookback_days ?? 60,
          top_k: params.top_k ?? 10,
          engage_window_min: params.engage_window_min ?? 90,
        }
      });

      if (error) throw error;
      return data;
    }
  });
}

// New verbose hook with badges support
export interface VerbosePersonalizedVenue {
  venue_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  dist_m: number;
  walk_min: number;
  price_tier: PriceTier | null;
  rating: number | null;
  popularity: number | null;
  categories: string[] | null;
  score: number;
  components: any; // JSONB object with scoring components
  weights: any; // JSONB object with applied weights
  badges: string[]; // NEW: Array of badges like ["Walkable", "Top rated", "In budget"]
  reason: string;
  provider: string | null;
  provider_id: string | null;
  photo_url: string | null;
  external_id: string | null;
  geohash5: string | null;
  explain?: {
    why: string;
    badges: string[];
    components: Record<string, number>;
    weights: Record<string, number>;
    weighted: Record<string, number>;
    confidence: number;
    crowd: {
      currentCapacityPct?: number;
      predictedPeakWindow?: string;
      predictedPeakReason?: string;
      currentWaitMins?: number;
    };
    social: {
      friendsVisitedCount?: number;
      friendsRecent?: { name: string; when: string }[];
      friendRating?: number | null;
      compatibilityPct?: number;
    };
    context: { walkMin: number; openNow?: boolean; inBudget?: boolean };
    topReasons: string[];
  };
}

export function usePersonalizedVenuesVerbose(params: {
  lat: number;
  lng: number;
  vibe?: string;
  tags?: string[];
  radiusM?: number;
  limit?: number;
  ab?: string;
}) {
  const { user } = useAuth();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';

  return useQuery({
    queryKey: ['personalizedVenuesVerbose', { ...params, tz, profileId: user?.id }],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('get_personalized_recs_verbose', {
        p_profile_id: user.id,
        p_lat: params.lat,
        p_lng: params.lng,
        p_vibe: params.vibe ?? null,
        p_tags: params.tags ?? null,
        p_radius_m: params.radiusM ?? 3000,
        p_limit: params.limit ?? 20,
        p_tz: tz,
        p_ab: params.ab ?? 'verbose',
        p_log: true,
      });

      if (error) {
        console.error('Verbose personalized venues failed:', error);
        
        // Handle specific error codes gracefully
        if (error.code === '42883' ||   // function does not exist
            error.code === '404' ||     // function not found
            error.code === 'PGRST116') { // out of range
          return [] as VerbosePersonalizedVenue[];
        }
        
        throw error;
      }
      return (data || []) as VerbosePersonalizedVenue[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}