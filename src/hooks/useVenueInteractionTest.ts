import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { devLog, devError } from '@/lib/devLog';

type InteractionRow = {
  id: string;
  venue_id: string;
  profile_id: string;
  interaction_type: 'favorite' | 'check_in' | 'view' | 'share';
  interaction_count: number;
  last_interaction_at: string;
  created_at: string;
};

type PresenceRow = {
  venue_id: string;
  profile_id: string;
  vibe: string;
  last_heartbeat: string;
  expires_at: string;
};

type TestResult = {
  venueId: string;
  profileId: string;
  interactions: InteractionRow[];
  presence: PresenceRow | null;
  hasInteractions: boolean;
  isCurrentlyPresent: boolean;
  favoriteCount: number;
  checkInCount: number;
  viewCount: number;
  shareCount: number;
};

/**
 * Test hook to verify venue interaction functionality
 * This helps validate that our bump_interaction function and database setup is working
 */
export const useVenueInteractionTest = (venueId: string | null) => {
  const { user } = useAuth();

  return useQuery<TestResult | null>({
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
        .eq('profile_id', user.id)
        .returns<InteractionRow[]>();

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
        .maybeSingle()
        .returns<PresenceRow>();

      if (presenceError) {
        devError('❌ Failed to fetch venue presence:', presenceError);
        // Don't throw, this is optional
      }

      const interactionsList: InteractionRow[] = interactions ?? [];
      const presenceRow: PresenceRow | null = presence ?? null;

      // Helper to find interaction count by type
      const findCount = (type: InteractionRow['interaction_type']) =>
        interactionsList.find(i => i.interaction_type === type)?.interaction_count ?? 0;

      const testResult: TestResult = {
        venueId,
        profileId: user.id,
        interactions: interactionsList,
        presence: presenceRow,
        hasInteractions: interactionsList.length > 0,
        isCurrentlyPresent: presenceRow ? new Date(presenceRow.expires_at) > new Date() : false,
        favoriteCount: findCount('favorite'),
        checkInCount: findCount('check_in'),
        viewCount: findCount('view'),
        shareCount: findCount('share'),
      };

      devLog('✅ Venue interaction test results:', testResult);
      return testResult;
    },
    enabled: !!venueId && !!user?.id,
    staleTime: 10000, // 10 seconds - test data changes frequently
    gcTime: 30000, // 30 seconds
  });
};