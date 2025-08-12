// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentVibe } from '@/lib/store/useVibe';
import { useTrackInteraction } from '@/hooks/usePersonalizedVenues';
import { devLog, devError } from '@/lib/devLog';

export type InteractionType = 'check_in' | 'favorite' | 'share' | 'view' | 'like' | 'bookmark' | 'dismiss' | 'dislike' | 'plan';

interface VenueInteraction {
  venue_id: string;
  interaction_type: InteractionType;
  context?: {
    lat?: number;
    lng?: number;
    vibe?: string;
    radius_m?: number;
  };
}

export const useVenueInteractions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentVibe = useCurrentVibe();
  const trackInteractionMutation = useTrackInteraction();

  const trackInteraction = useMutation({
    mutationFn: async ({ venue_id, interaction_type, context }: VenueInteraction) => {
      if (!user?.id) {
        devError('❌ User not authenticated for venue interaction');
        throw new Error('User not authenticated');
      }
      
      devLog(`🎯 Tracking ${interaction_type} interaction for venue ${venue_id} by user ${user.id}`);
      
      // Use the new tracking system that handles strong vs weak signals
      const result = await trackInteractionMutation.mutateAsync({
        venue_id,
        interaction_type,
        context: {
          ...context,
          vibe: context?.vibe || currentVibe || 'social'
        }
      });

      // Legacy: If this is a check-in, also record to venue_live_presence for afterglow
      if (interaction_type === 'check_in') {
        devLog(`📍 Recording venue presence for check-in at ${venue_id}`);
        const { error: presenceError } = await supabase
          .from('venue_live_presence')
          .upsert({
            venue_id: venue_id,
            profile_id: user.id,
            vibe: currentVibe || 'social',
            checked_in_at: new Date().toISOString(),
            last_heartbeat: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours
          });

        if (presenceError) {
          devError('⚠️ Failed to record venue presence:', presenceError);
          // Continue even if presence recording fails
        } else {
          devLog('✅ Successfully recorded venue presence');
        }
      }

      return result;
    },
    onSuccess: (data, variables) => {
      devLog(`🔄 Invalidating queries after ${variables.interaction_type} interaction`);
      // Invalidate venue details to update live count
      queryClient.invalidateQueries({ 
        queryKey: ['venue-details', variables.venue_id]
      });
      // Invalidate personalized venue queries to update recommendations
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && (
            query.queryKey[0] === 'personalized-venues' || 
            query.queryKey[0] === 'personalizedVenues' ||
            query.queryKey[0] === 'smart-discovery'
          )
      });
    },
    onError: (error, variables) => {
      devError(`🚨 Venue interaction failed for ${variables.interaction_type}:`, error);
    }
  });

  // Helper functions for each interaction type
  const checkIn = (venue_id: string, context?: VenueInteraction['context']) => 
    trackInteraction.mutate({ venue_id, interaction_type: 'check_in', context });

  const favorite = (venue_id: string, context?: VenueInteraction['context']) => 
    trackInteraction.mutate({ venue_id, interaction_type: 'favorite', context });

  const share = (venue_id: string, context?: VenueInteraction['context']) => 
    trackInteraction.mutate({ venue_id, interaction_type: 'share', context });

  const view = (venue_id: string, context?: VenueInteraction['context']) => 
    trackInteraction.mutate({ venue_id, interaction_type: 'view', context });

  // New interaction types for recommendation learning
  const like = (venue_id: string, context?: VenueInteraction['context']) => 
    trackInteraction.mutate({ venue_id, interaction_type: 'like', context });

  const bookmark = (venue_id: string, context?: VenueInteraction['context']) => 
    trackInteraction.mutate({ venue_id, interaction_type: 'bookmark', context });

  const dismiss = (venue_id: string, context?: VenueInteraction['context']) => 
    trackInteraction.mutate({ venue_id, interaction_type: 'dismiss', context });

  const dislike = (venue_id: string, context?: VenueInteraction['context']) => 
    trackInteraction.mutate({ venue_id, interaction_type: 'dislike', context });

  const plan = (venue_id: string, context?: VenueInteraction['context']) => 
    trackInteraction.mutate({ venue_id, interaction_type: 'plan', context });

  return {
    trackInteraction: trackInteraction.mutate,
    checkIn,
    favorite, 
    share,
    view,
    like,
    bookmark,
    dismiss,
    dislike,
    plan,
    isLoading: trackInteraction.isPending,
  };
};