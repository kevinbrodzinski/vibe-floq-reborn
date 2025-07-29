import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LocationSharingStatus {
  isSharing: boolean;
  accuracyLevel: 'exact' | 'street' | 'area';
  sharedSince: Date | null;
}

export function useUserLocationSharing(profileId: string | undefined) {
  return useQuery({
    queryKey: ['user-location-sharing', profileId],
    queryFn: async (): Promise<LocationSharingStatus> => {
      if (!profileId) {
        return {
          isSharing: false,
          accuracyLevel: 'exact',
          sharedSince: null,
        };
      }

      console.log('[DEBUG] Checking location sharing for profile:', profileId);

      try {
        // Check if user is currently sharing location with us
        const { data: sharePrefs, error: shareError } = await supabase
          .from('friend_share_pref')
          .select('is_live, ends_at')
          .eq('profile_id', profileId)
          .single();

        if (shareError && shareError.code !== 'PGRST116') {
          console.log('[DEBUG] Error fetching share prefs:', shareError);
          return {
            isSharing: false,
            accuracyLevel: 'exact',
            sharedSince: null,
          };
        }

        if (!sharePrefs?.is_live) {
          return {
            isSharing: false,
            accuracyLevel: 'exact',
            sharedSince: null,
          };
        }

        // Check if share hasn't expired
        const now = new Date();
        const endsAt = sharePrefs.ends_at ? new Date(sharePrefs.ends_at) : null;
        
        if (endsAt && now > endsAt) {
          return {
            isSharing: false,
            accuracyLevel: 'exact',
            sharedSince: null,
          };
        }

        // Check if they have recent presence data (active within last 5 minutes)
        const { data: presence, error: presenceError } = await supabase
          .from('vibes_now')
          .select('updated_at')
          .eq('profile_id', profileId)
          .single();

        if (presenceError && presenceError.code !== 'PGRST116') {
          console.log('[DEBUG] Error fetching presence:', presenceError);
        }

        const isRecentlyActive = presence?.updated_at && 
          (now.getTime() - new Date(presence.updated_at).getTime()) < 5 * 60 * 1000;

        return {
          isSharing: isRecentlyActive || false,
          accuracyLevel: 'exact', // Default for now since it's not in the schema
          sharedSince: presence?.updated_at ? new Date(presence.updated_at) : null,
        };
      } catch (error) {
        console.log('[DEBUG] Unexpected error in location sharing check:', error);
        return {
          isSharing: false,
          accuracyLevel: 'exact',
          sharedSince: null,
        };
      }
    },
    enabled: !!profileId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
}