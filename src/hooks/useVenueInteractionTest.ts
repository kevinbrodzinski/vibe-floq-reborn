import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/EnhancedAuthProvider';
import { devLog, devError } from '@/lib/devLog';

/**
 * Test hook to verify venue interaction functionality
 * This helps validate that our bump_interaction function and database setup is working
 */
export const useVenueInteractionTest = (venueId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['venue-interaction-test', venueId, user?.id],
    queryFn: async () => {
      if (!venueId || !user?.id) {
        return null;
      }

      devLog(`🧪 Testing venue interactions for venue ${venueId}, user ${user.id}`);

      // Check if user has any interactions with this venue
      const { data: interactions, error: interactionsError } = await supabase
        .from('user_venue_interactions')
        .select('*')
        .eq('venue_id', venueId)
        .eq('profile_id', user.id);

      if (interactionsError) {
        devError('❌ Failed to fetch venue interactions:', interactionsError);
        throw interactionsError;
      }

      // Check venue live presence
      const { data: presence, error: presenceError } = await supabase
        .from('venue_live_presence')
        .select('*')
        .eq('venue_id', venueId)
        .eq('profile_id', user.id)
        .maybeSingle();

      if (presenceError) {
        devError('❌ Failed to fetch venue presence:', presenceError);
        // Don't throw, this is optional
      }

      const testResult = {
        venueId,
        userId: user.id,
        interactions: interactions || [],
        presence: presence || null,
        hasInteractions: (interactions?.length || 0) > 0,
        isCurrentlyPresent: presence && new Date(presence.expires_at) > new Date(),
        favoriteCount: interactions?.find(i => i.interaction_type === 'favorite')?.interaction_count || 0,
        checkInCount: interactions?.find(i => i.interaction_type === 'check_in')?.interaction_count || 0,
        viewCount: interactions?.find(i => i.interaction_type === 'view')?.interaction_count || 0,
        shareCount: interactions?.find(i => i.interaction_type === 'share')?.interaction_count || 0
      };

      devLog('✅ Venue interaction test results:', testResult);
      return testResult;
    },
    enabled: !!venueId && !!user?.id,
    staleTime: 10000, // 10 seconds - test data changes frequently
  });
};