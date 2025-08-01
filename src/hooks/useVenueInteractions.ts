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
      if (!user?.id) throw new Error('User not authenticated');
      
      const { error } = await supabase.rpc('bump_interaction', {
        p_profile_id: user.id,
        p_venue_id: venue_id,
        p_type: interaction_type
      });
      
      if (error) throw error;

      // If this is a check-in, also record to venue_live_presence for afterglow
      if (interaction_type === 'check_in') {
        const { error: presenceError } = await supabase
          .from('venue_live_presence')
          .upsert({
            venue_id: venue_id,
            vibe: currentVibe || 'social', // Required field - use current vibe or default
            checked_in_at: new Date().toISOString(),
            last_heartbeat: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours
          }, {
            onConflict: 'venue_id' // Based on table schema
          });

        if (presenceError) {
          console.error('Failed to record venue presence:', presenceError);
          // Continue even if presence recording fails
        }
      }

      return { venue_id, interaction_type };
    },
    onSuccess: () => {
      // Invalidate personalized venue queries to update recommendations
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'personalized-venues' || 
          query.queryKey[0] === 'smart-discovery'
      });
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