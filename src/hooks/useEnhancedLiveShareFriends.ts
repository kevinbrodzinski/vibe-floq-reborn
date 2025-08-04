import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCloseFriendsLocationSettings } from '@/hooks/useCloseFriendsLocationSharing';

/** 
 * Enhanced UUIDs of people the current user is live-sharing with
 * Includes both individual friend preferences AND close friends location sharing
 */
export function useEnhancedLiveShareFriends() {
  const { data: closeFriendsSettings } = useCloseFriendsLocationSettings();

  const { data, error, ...rest } = useQuery({
    queryKey: ['enhanced-live-share-friends', closeFriendsSettings?.enabled],
    queryFn: async () => {
      // Get individual friend sharing preferences
      const { data: individualPrefs, error: individualError } = await supabase
        .from('friend_share_pref')
        .select('other_profile_id')
        .eq('is_live', true);

      if (individualError) throw individualError;

      const individualShareIds = individualPrefs?.map(row => row.other_profile_id) || [];

      // If close friends location sharing is enabled, get all close friends
      let closeFriendsIds: string[] = [];
      if (closeFriendsSettings?.enabled) {
        const { data: closeFriends, error: closeFriendsError } = await supabase
          .rpc('get_close_friends');

        if (closeFriendsError) {
          console.warn('Failed to get close friends for location sharing:', closeFriendsError);
        } else {
          closeFriendsIds = closeFriends?.map((friend: any) => friend.friend_id) || [];
        }
      }

      // Combine and deduplicate
      const allShareIds = [...new Set([...individualShareIds, ...closeFriendsIds])];
      
      return {
        allShareIds,
        individualShareIds,
        closeFriendsIds,
        closeFriendsLocationEnabled: closeFriendsSettings?.enabled || false,
        totalCount: allShareIds.length,
        closeFriendsCount: closeFriendsIds.length,
        individualCount: individualShareIds.length
      };
    },
    staleTime: 60_000,
    retry: false,
    enabled: true, // Always enabled, but closeFriendsSettings might be undefined initially
  });

  if (error) {
    console.warn('useEnhancedLiveShareFriends error:', error);
    return {
      allShareIds: [],
      individualShareIds: [],
      closeFriendsIds: [],
      closeFriendsLocationEnabled: false,
      totalCount: 0,
      closeFriendsCount: 0,
      individualCount: 0,
      ...rest
    };
  }

  return data || {
    allShareIds: [],
    individualShareIds: [],
    closeFriendsIds: [],
    closeFriendsLocationEnabled: false,
    totalCount: 0,
    closeFriendsCount: 0,
    individualCount: 0,
    ...rest
  };
}

/**
 * Backward compatibility hook - returns just the IDs like the original
 * This can be used as a drop-in replacement for useLiveShareFriends
 */
export function useCompatibleLiveShareFriends(): string[] {
  const { allShareIds } = useEnhancedLiveShareFriends();
  return allShareIds;
}