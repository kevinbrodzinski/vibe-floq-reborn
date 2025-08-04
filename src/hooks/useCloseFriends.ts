import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { 
  CloseFriend, 
  ToggleCloseFriendResponse, 
  CloseFriendsListResponse,
  FriendshipWithCloseStatus 
} from '@/types/closeFriends';
import { toast } from 'sonner';

// Hook to get close friends list
export const useCloseFriends = () => {
  const currentUserId = useCurrentUserId();

  return useQuery({
    queryKey: ['close-friends', currentUserId],
    queryFn: async (): Promise<CloseFriend[]> => {
      if (!currentUserId) return [];

      const { data, error } = await supabase
        .rpc('get_close_friends', { user_id: currentUserId });

      if (error) {
        console.error('Error fetching close friends:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!currentUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to toggle close friend status
export const useToggleCloseFriend = () => {
  const queryClient = useQueryClient();
  const currentUserId = useCurrentUserId();

  return useMutation({
    mutationFn: async ({ 
      friendId, 
      isCloseFriend 
    }: { 
      friendId: string; 
      isCloseFriend: boolean; 
    }): Promise<boolean> => {
      const { data, error } = await supabase
        .rpc('toggle_close_friend', {
          target_user_id: friendId,
          is_close_friend: isCloseFriend
        });

      if (error) {
        console.error('Error toggling close friend:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (success, { friendId, isCloseFriend }) => {
      if (success) {
        // Invalidate and refetch related queries
        queryClient.invalidateQueries({ queryKey: ['close-friends'] });
        queryClient.invalidateQueries({ queryKey: ['friendship-info'] });
        queryClient.invalidateQueries({ queryKey: ['friends-list'] });
        
        // Show success toast
        toast.success(
          isCloseFriend 
            ? 'Added to close friends!' 
            : 'Removed from close friends'
        );
      } else {
        toast.error('Failed to update close friend status');
      }
    },
    onError: (error) => {
      console.error('Close friend toggle error:', error);
      toast.error('Failed to update close friend status');
    },
  });
};

// Hook to check if a user is a close friend
export const useIsCloseFriend = (friendId: string | undefined) => {
  const currentUserId = useCurrentUserId();

  return useQuery({
    queryKey: ['is-close-friend', currentUserId, friendId],
    queryFn: async (): Promise<boolean> => {
      if (!currentUserId || !friendId || currentUserId === friendId) {
        return false;
      }

      const { data, error } = await supabase
        .from('friendships')
        .select('is_close, friend_state')
        .or(`and(user_low.eq.${currentUserId},user_high.eq.${friendId}),and(user_low.eq.${friendId},user_high.eq.${currentUserId})`)
        .maybeSingle();

      if (error) {
        console.error('Error checking close friend status:', error);
        return false;
      }

      return data?.friend_state === 'accepted' && data?.is_close === true;
    },
    enabled: !!currentUserId && !!friendId && currentUserId !== friendId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook to get all friendships with close friend status
export const useFriendshipsWithCloseStatus = () => {
  const currentUserId = useCurrentUserId();

  return useQuery({
    queryKey: ['friendships-with-close-status', currentUserId],
    queryFn: async (): Promise<FriendshipWithCloseStatus[]> => {
      if (!currentUserId) return [];

      const { data, error } = await supabase
        .from('friendships')
        .select(`
          user_low,
          user_high,
          friend_state,
          is_close,
          created_at,
          responded_at
        `)
        .or(`user_low.eq.${currentUserId},user_high.eq.${currentUserId}`)
        .eq('friend_state', 'accepted');

      if (error) {
        console.error('Error fetching friendships:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!currentUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to get close friends count
export const useCloseFriendsCount = () => {
  const { data: closeFriends = [] } = useCloseFriends();
  return closeFriends.length;
};

// Hook to filter content based on close friends
export const useCloseFriendsFilter = () => {
  const { data: closeFriends = [] } = useCloseFriends();
  const closeFriendIds = closeFriends.map(friend => friend.friend_id);

  const filterForCloseFriends = <T extends { author_id?: string; user_id?: string }>(
    items: T[]
  ): T[] => {
    return items.filter(item => {
      const authorId = item.author_id || item.user_id;
      return authorId && closeFriendIds.includes(authorId);
    });
  };

  const isFromCloseFriend = (userId: string): boolean => {
    return closeFriendIds.includes(userId);
  };

  return {
    closeFriendIds,
    filterForCloseFriends,
    isFromCloseFriend,
    closeFriendsCount: closeFriends.length,
  };
};