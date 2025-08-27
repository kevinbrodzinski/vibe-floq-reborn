import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useCurrentUserId } from '@/hooks/useCurrentUser';

export interface FriendshipInfo {
  friendsSince: string | null;
  lastInteraction: string | null;
  daysSinceLastHang: number | null;
  isFriend: boolean;
}

export const useFriendshipInfo = (profileId: string | undefined) => {
  const currentUserId = useCurrentUserId();

  return useQuery({
    queryKey: ['friendship-info', currentUserId, profileId],
    queryFn: async (): Promise<FriendshipInfo> => {
      if (!currentUserId || !profileId || currentUserId === profileId) {
        return { friendsSince: null, lastInteraction: null, daysSinceLastHang: null, isFriend: false };
      }

      // Check friendship using the friendships table 
      // Use canonical ordering: profile_low is always the smaller UUID
      const profileLow = currentUserId < profileId ? currentUserId : profileId;
      const profileHigh = currentUserId < profileId ? profileId : currentUserId;
      
      const { data: friends } = await supabase
        .from('friendships')
        .select('*')
        .eq('profile_low', profileLow as any)
        .eq('profile_high', profileHigh as any)
        .maybeSingle();

      if (!friends) {
        return { friendsSince: null, lastInteraction: null, daysSinceLastHang: null, isFriend: false };
      }

      // Try to get interaction data from flock_relationships if it exists
      const userA = currentUserId < profileId ? currentUserId : profileId;
      const userB = currentUserId < profileId ? profileId : currentUserId;
      
      const { data: relationship } = await supabase
        .from('flock_relationships')
        .select('last_interaction_at')
        .eq('user_a_id', userA as any)
        .eq('user_b_id', userB as any)
        .maybeSingle();

      // Calculate days since last interaction
      let daysSinceLastHang = null;
      if (relationship && (relationship as any).last_interaction_at) {
        const lastInteraction = new Date((relationship as any).last_interaction_at);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastInteraction.getTime());
        daysSinceLastHang = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        friendsSince: (friends as any).created_at,
        lastInteraction: relationship ? (relationship as any).last_interaction_at || null : null,
        daysSinceLastHang,
        isFriend: true
      };
    },
    enabled: !!currentUserId && !!profileId && currentUserId !== profileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};