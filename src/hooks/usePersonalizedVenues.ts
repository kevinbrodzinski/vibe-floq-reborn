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