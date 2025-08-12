import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PersonalizedVenue {
  venue_id: string;
  name: string;
  dist_m: number;
  score: number;
  reason: string;
}

export interface UsePersonalizedVenuesParams {
  lat: number;
  lng: number;
  vibe?: string;
  tags?: string[];
  radiusM?: number;
  limit?: number;
  ab?: string; // A/B test bucket
  useLLM?: boolean; // Enable LLM re-ranking
  llmTopK?: number; // How many to re-rank with LLM
}

export function usePersonalizedVenues(params: UsePersonalizedVenuesParams) {
  const { user } = useAuth();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';

  return useQuery({
    queryKey: ['personalizedVenues', { ...params, tz, profileId: user?.id }],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Call the recommend edge function
      const { data, error } = await supabase.functions.invoke('recommend', {
        body: {
          profile_id: user.id,
          lat: params.lat,
          lng: params.lng,
          vibe: params.vibe ?? null,
          tags: params.tags ?? null,
          radius_m: params.radiusM ?? 3000,
          limit: params.limit ?? 20,
          tz,
          ab: params.ab ?? null,
          use_llm: params.useLLM ?? false,
          llm_top_k: params.llmTopK ?? 30,
        }
      });

      if (error) throw error;
      if (!data.ok) throw new Error(data.error || 'Failed to get recommendations');

      return {
        items: data.items as PersonalizedVenue[],
        llm: data.llm as boolean,
      };
    },
    enabled: Boolean(user?.id && params.lat && params.lng),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for direct RPC call (alternative to edge function)
export function usePersonalizedVenuesRPC(params: UsePersonalizedVenuesParams) {
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
        p_radius_m: params.radiusM ?? 3000,
        p_vibe: params.vibe ?? null,
        p_tags: params.tags ?? null,
        p_tz: tz,
        p_limit: params.limit ?? 20,
        p_ab: params.ab ?? null,
        p_log: true,
      });

      if (error) throw error;
      return data as PersonalizedVenue[];
    },
    enabled: Boolean(user?.id && params.lat && params.lng),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for tracking interactions
export function useTrackInteraction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      venueId,
      interactionType,
      context,
    }: {
      venueId: string;
      interactionType: 'view' | 'tap' | 'bookmark' | 'checkin' | 'plan' | 'share' | 'dismiss' | 'like' | 'dislike';
      context?: {
        lat?: number;
        lng?: number;
        vibe?: string;
        tags?: string[];
        radiusM?: number;
        tz?: string;
      };
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // For strong signals, call the online learning function
      const strongSignals = new Set(['like', 'bookmark', 'checkin', 'plan', 'dismiss', 'dislike']);
      if (strongSignals.has(interactionType)) {
        await supabase.functions.invoke('on-interaction', {
          body: {
            profile_id: user.id,
            venue_id: venueId,
            interaction_type: interactionType,
            context: {
              ...context,
              tz: context?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
              now: new Date().toISOString(),
            },
          }
        });
      } else {
        // For weak signals, just track the interaction
        await supabase.rpc('track_interaction', {
          p_profile_id: user.id,
          p_venue_id: venueId,
          p_type: interactionType,
          p_weight: 0,
          p_context: context ?? {},
        });
      }
    },
    onSuccess: () => {
      // Invalidate venue recommendations to get fresh results
      queryClient.invalidateQueries({ queryKey: ['personalizedVenues'] });
      queryClient.invalidateQueries({ queryKey: ['personalizedVenuesRPC'] });
    },
  });
}

// Hook for updating user tastes
export function useUpdateUserTastes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tastes: {
      preferred_cuisines?: string[];
      disliked_cuisines?: string[];
      preferred_tags?: string[];
      disliked_tags?: string[];
      dietary?: string[];
      vibe_preference?: string[];
      price_min?: number;
      price_max?: number;
      distance_max_m?: number;
      open_now_only?: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      await supabase.rpc('upsert_user_tastes', {
        p_profile_id: user.id,
        p_json: tastes,
      });
    },
    onSuccess: () => {
      // Invalidate venue recommendations to get fresh results
      queryClient.invalidateQueries({ queryKey: ['personalizedVenues'] });
      queryClient.invalidateQueries({ queryKey: ['personalizedVenuesRPC'] });
    },
  });
}

// Hook for training user model (admin/debug use)
export function useTrainUserModel() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (options?: {
      lookback_days?: number;
      top_k?: number;
      engage_window_min?: number;
      min_samples?: number;
      lr?: number;
      l2?: number;
      iters?: number;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('train-user-model', {
        body: {
          profile_id: user.id,
          ...options,
        }
      });

      if (error) throw error;
      return data;
    },
  });
}