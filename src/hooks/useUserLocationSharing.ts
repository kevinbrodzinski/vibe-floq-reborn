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

      // Use standardized mock data utilities instead of inline demo logic
      const { isDemoProfile, generateDemoLocationSharing } = await import('@/lib/location/mockData');
      
      if (isDemoProfile(profileId)) {
        return generateDemoLocationSharing();
      }

      try {
        // For non-demo users, check actual database (original logic)
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

        const now = new Date();
        const endsAt = sharePrefs.ends_at ? new Date(sharePrefs.ends_at) : null;
        
        if (endsAt && now > endsAt) {
          return {
            isSharing: false,
            accuracyLevel: 'exact',
            sharedSince: null,
          };
        }

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
          accuracyLevel: 'exact',
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