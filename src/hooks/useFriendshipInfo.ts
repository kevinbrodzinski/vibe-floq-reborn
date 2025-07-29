import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

      // Check friendship in flock_relationships table
      const { data: relationship } = await supabase
        .from('flock_relationships')
        .select('created_at, last_interaction_at')
        .or(`and(user_a_id.eq.${currentUserId},user_b_id.eq.${profileId}),and(user_a_id.eq.${profileId},user_b_id.eq.${currentUserId})`)
        .single();

      if (!relationship) {
        return { friendsSince: null, lastInteraction: null, daysSinceLastHang: null, isFriend: false };
      }

      // Calculate days since last interaction
      let daysSinceLastHang = null;
      if (relationship.last_interaction_at) {
        const lastInteraction = new Date(relationship.last_interaction_at);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastInteraction.getTime());
        daysSinceLastHang = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        friendsSince: relationship.created_at,
        lastInteraction: relationship.last_interaction_at,
        daysSinceLastHang,
        isFriend: true
      };
    },
    enabled: !!currentUserId && !!profileId && currentUserId !== profileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};