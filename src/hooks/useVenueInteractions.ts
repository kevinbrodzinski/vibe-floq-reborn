import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useCurrentVibe } from '@/lib/store/useVibe';

export type InteractionType = 'check_in' | 'favorite' | 'share' | 'view';

interface VenueInteraction {
  venue_id: string;
  interaction_type: InteractionType;
}

export const useVenueInteractions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentVibe = useCurrentVibe();

  const trackInteraction = useMutation({
    mutationFn: async ({ venue_id, interaction_type }: VenueInteraction) => {
      if (!user?.id) {
        console.error('❌ User not authenticated for venue interaction');
        throw new Error('User not authenticated');
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🎯 Tracking ${interaction_type} interaction for venue ${venue_id} by user ${user.id}`);
      }
      
      const { error } = await supabase.rpc('bump_interaction', {
        p_profile_id: user.id,
        p_venue_id: venue_id,
        p_type: interaction_type
      });
      
      if (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(`❌ Failed to track ${interaction_type} interaction:`, error);
        }
        throw error;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(`✅ Successfully tracked ${interaction_type} interaction for venue ${venue_id}`);
      }

      // If this is a check-in, also record to venue_live_presence for afterglow
      if (interaction_type === 'check_in') {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`📍 Recording venue presence for check-in at ${venue_id}`);
        }
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
          if (process.env.NODE_ENV !== 'production') {
            console.error('⚠️ Failed to record venue presence:', presenceError);
          }
          // Continue even if presence recording fails
        } else if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Successfully recorded venue presence');
        }
      }

      return { venue_id, interaction_type };
    },
    onSuccess: (data) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔄 Invalidating queries after ${data.interaction_type} interaction`);
      }
      // Invalidate venue details to update live count
      queryClient.invalidateQueries({ 
        queryKey: ['venue-details', data.venue_id]
      });
      // Invalidate personalized venue queries to update recommendations
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && (
            query.queryKey[0] === 'personalized-venues' || 
            query.queryKey[0] === 'smart-discovery'
          )
      });
    },
    onError: (error, variables) => {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`🚨 Venue interaction failed for ${variables.interaction_type}:`, error);
      }
    }
  });

  const checkIn = (venue_id: string) => trackInteraction.mutate({ 
    venue_id, 
    interaction_type: 'check_in' 
  });

  const favorite = (venue_id: string) => trackInteraction.mutate({ 
    venue_id, 
    interaction_type: 'favorite' 
  });

  const share = (venue_id: string) => trackInteraction.mutate({ 
    venue_id, 
    interaction_type: 'share' 
  });

  const view = (venue_id: string) => trackInteraction.mutate({ 
    venue_id, 
    interaction_type: 'view' 
  });

  return {
    trackInteraction: trackInteraction.mutate,
    checkIn,
    favorite,
    share,
    view,
    isLoading: trackInteraction.isPending
  };
};