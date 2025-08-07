import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

interface FriendshipMutationContext {
  previousFriends?: any;
  previousRequests?: any;
}

export function useAtomicFriendships() {
  const currentUserId = useCurrentUserId();
  const queryClient = useQueryClient();

  // Send friend request with rate limiting and duplicate prevention
  const sendFriendRequest = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!currentUserId) throw new Error('User not authenticated');
      if (currentUserId === targetUserId) throw new Error('Cannot send request to yourself');

      // Use the rate-limited edge function
      const { data, error } = await supabase.rpc('send_friend_request_with_rate_limit', {
        _target_user: targetUserId,
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes('rate limit')) {
          throw new Error('Too many friend requests sent. Please wait before sending more.');
        }
        if (error.message.includes('already exists')) {
          throw new Error('Friend request already sent or you are already friends.');
        }
        if (error.message.includes('blocked')) {
          throw new Error('Unable to send friend request.');
        }
        throw error;
      }

      return data;
    },
    onMutate: async (targetUserId) => {
      // Cancel outgoing queries to prevent optimistic updates from being overwritten
      await queryClient.cancelQueries({ queryKey: ['friends', currentUserId] });

      // Snapshot current state
      const previousFriends = queryClient.getQueryData(['friends', currentUserId]);

      // Optimistically add pending outgoing request
      queryClient.setQueryData(['friends', currentUserId], (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          rows: [...old.rows, {
            id: targetUserId,
            friend_state: 'pending',
            is_outgoing_request: true,
            is_incoming_request: false,
            created_at: new Date().toISOString(),
            // We don't have profile data, so it will be fetched on refetch
          }],
        };
      });

      return { previousFriends, targetUserId };
    },
    onError: (error, targetUserId, context) => {
      // Rollback optimistic update
      if (context?.previousFriends) {
        queryClient.setQueryData(['friends', currentUserId], context.previousFriends);
      }

      toast.error('Failed to send friend request', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
    onSuccess: (data, targetUserId) => {
      // Refetch to get accurate server state with profile data
      queryClient.invalidateQueries({ queryKey: ['friends', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['discover'] }); // Update discovery cache
      
      toast.success('Friend request sent! 🎉');
    },
  });

  // Accept friend request atomically
  const acceptFriendRequest = useMutation({
    mutationFn: async (fromUserId: string) => {
      if (!currentUserId) throw new Error('User not authenticated');

      // Use atomic accept function to prevent race conditions
      const { data, error } = await supabase.rpc('accept_friend_request_atomic', {
        _from_user: fromUserId,
      });

      if (error) {
        if (error.message.includes('not found')) {
          throw new Error('Friend request not found or already processed.');
        }
        throw error;
      }

      return data;
    },
    onMutate: async (fromUserId) => {
      await queryClient.cancelQueries({ queryKey: ['friends', currentUserId] });
      
      const previousFriends = queryClient.getQueryData(['friends', currentUserId]);

      // Optimistically update the request to accepted state
      queryClient.setQueryData(['friends', currentUserId], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          rows: old.rows.map((friend: any) => {
            if (friend.id === fromUserId && friend.friend_state === 'pending' && friend.is_incoming_request) {
              return {
                ...friend,
                friend_state: 'accepted',
                is_incoming_request: false,
                is_outgoing_request: false,
                responded_at: new Date().toISOString(),
              };
            }
            return friend;
          }),
        };
      });

      return { previousFriends, fromUserId };
    },
    onError: (error, fromUserId, context) => {
      if (context?.previousFriends) {
        queryClient.setQueryData(['friends', currentUserId], context.previousFriends);
      }

      toast.error('Failed to accept friend request', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
    onSuccess: (data, fromUserId) => {
      queryClient.invalidateQueries({ queryKey: ['friends', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['discover'] });
      
      toast.success('Friend request accepted! ✅');
    },
  });

  // Reject/cancel friend request
  const rejectFriendRequest = useMutation({
    mutationFn: async ({ userId, isIncoming }: { userId: string; isIncoming: boolean }) => {
      if (!currentUserId) throw new Error('User not authenticated');

      if (isIncoming) {
        // Rejecting an incoming request
        const { error } = await supabase
          .from('friend_requests')
          .update({ 
            status: 'rejected',
            responded_at: new Date().toISOString(),
          })
          .eq('profile_id', userId)
          .eq('other_profile_id', currentUserId)
          .eq('status', 'pending');

        if (error) throw error;
      } else {
        // Canceling an outgoing request
        const { error } = await supabase
          .from('friend_requests')
          .delete()
          .eq('profile_id', currentUserId)
          .eq('other_profile_id', userId)
          .eq('status', 'pending');

        if (error) throw error;
      }
    },
    onMutate: async ({ userId, isIncoming }) => {
      await queryClient.cancelQueries({ queryKey: ['friends', currentUserId] });
      
      const previousFriends = queryClient.getQueryData(['friends', currentUserId]);

      // Optimistically remove the request
      queryClient.setQueryData(['friends', currentUserId], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          rows: old.rows.filter((friend: any) => 
            !(friend.id === userId && friend.friend_state === 'pending')
          ),
        };
      });

      return { previousFriends, userId, isIncoming };
    },
    onError: (error, variables, context) => {
      if (context?.previousFriends) {
        queryClient.setQueryData(['friends', currentUserId], context.previousFriends);
      }

      const action = variables.isIncoming ? 'reject' : 'cancel';
      toast.error(`Failed to ${action} friend request`, {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
    onSuccess: (data, { isIncoming }) => {
      queryClient.invalidateQueries({ queryKey: ['friends', currentUserId] });
      
      const message = isIncoming ? 'Friend request rejected' : 'Friend request cancelled';
      toast.success(message);
    },
  });

  // Block user
  const blockUser = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!currentUserId) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('upsert_friendship', {
        _other_user: targetUserId,
        _new_state: 'blocked',
      });

      if (error) throw error;
    },
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: ['friends', currentUserId] });
      
      const previousFriends = queryClient.getQueryData(['friends', currentUserId]);

      // Optimistically update or add blocked state
      queryClient.setQueryData(['friends', currentUserId], (old: any) => {
        if (!old) return old;

        const existingIndex = old.rows.findIndex((friend: any) => friend.id === targetUserId);
        
        if (existingIndex >= 0) {
          // Update existing relationship
          const updatedRows = [...old.rows];
          updatedRows[existingIndex] = {
            ...updatedRows[existingIndex],
            friend_state: 'blocked',
            is_incoming_request: false,
            is_outgoing_request: false,
          };
          return { ...old, rows: updatedRows };
        } else {
          // Add new blocked relationship
          return {
            ...old,
            rows: [...old.rows, {
              id: targetUserId,
              friend_state: 'blocked',
              is_incoming_request: false,
              is_outgoing_request: false,
              created_at: new Date().toISOString(),
            }],
          };
        }
      });

      return { previousFriends, targetUserId };
    },
    onError: (error, targetUserId, context) => {
      if (context?.previousFriends) {
        queryClient.setQueryData(['friends', currentUserId], context.previousFriends);
      }

      toast.error('Failed to block user', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
    onSuccess: (data, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ['friends', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['discover'] });
      
      toast.success('User blocked');
    },
  });

  // Unblock user
  const unblockUser = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!currentUserId) throw new Error('User not authenticated');

      // Remove the blocked relationship entirely
      const userLow = currentUserId < targetUserId ? currentUserId : targetUserId;
      const userHigh = currentUserId < targetUserId ? targetUserId : currentUserId;

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_low', userLow)
        .eq('user_high', userHigh)
        .eq('friend_state', 'blocked');

      if (error) throw error;
    },
    onMutate: async (targetUserId) => {
      await queryClient.cancelQueries({ queryKey: ['friends', currentUserId] });
      
      const previousFriends = queryClient.getQueryData(['friends', currentUserId]);

      // Optimistically remove blocked user
      queryClient.setQueryData(['friends', currentUserId], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          rows: old.rows.filter((friend: any) => 
            !(friend.id === targetUserId && friend.friend_state === 'blocked')
          ),
        };
      });

      return { previousFriends, targetUserId };
    },
    onError: (error, targetUserId, context) => {
      if (context?.previousFriends) {
        queryClient.setQueryData(['friends', currentUserId], context.previousFriends);
      }

      toast.error('Failed to unblock user', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
    onSuccess: (data, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ['friends', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['discover'] });
      
      toast.success('User unblocked');
    },
  });

  // Remove friend (unfriend)
  const removeFriend = useMutation({
    mutationFn: async (friendUserId: string) => {
      if (!currentUserId) throw new Error('User not authenticated');

      // Remove the friendship entirely
      const userLow = currentUserId < friendUserId ? currentUserId : friendUserId;
      const userHigh = currentUserId < friendUserId ? friendUserId : currentUserId;

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_low', userLow)
        .eq('user_high', userHigh)
        .eq('friend_state', 'accepted');

      if (error) throw error;
    },
    onMutate: async (friendUserId) => {
      await queryClient.cancelQueries({ queryKey: ['friends', currentUserId] });
      
      const previousFriends = queryClient.getQueryData(['friends', currentUserId]);

      // Optimistically remove friend
      queryClient.setQueryData(['friends', currentUserId], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          rows: old.rows.filter((friend: any) => 
            !(friend.id === friendUserId && friend.friend_state === 'accepted')
          ),
        };
      });

      return { previousFriends, friendUserId };
    },
    onError: (error, friendUserId, context) => {
      if (context?.previousFriends) {
        queryClient.setQueryData(['friends', currentUserId], context.previousFriends);
      }

      toast.error('Failed to remove friend', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
    onSuccess: (data, friendUserId) => {
      queryClient.invalidateQueries({ queryKey: ['friends', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['discover'] });
      
      toast.success('Friend removed');
    },
  });

  return {
    sendFriendRequest: sendFriendRequest.mutate,
    acceptFriendRequest: acceptFriendRequest.mutate,
    rejectFriendRequest: rejectFriendRequest.mutate,
    blockUser: blockUser.mutate,
    unblockUser: unblockUser.mutate,
    removeFriend: removeFriend.mutate,
    
    // Loading states
    isSending: sendFriendRequest.isPending,
    isAccepting: acceptFriendRequest.isPending,
    isRejecting: rejectFriendRequest.isPending,
    isBlocking: blockUser.isPending,
    isUnblocking: unblockUser.isPending,
    isRemoving: removeFriend.isPending,
    
    // Any operation in progress
    isLoading: [
      sendFriendRequest.isPending,
      acceptFriendRequest.isPending,
      rejectFriendRequest.isPending,
      blockUser.isPending,
      unblockUser.isPending,
      removeFriend.isPending,
    ].some(Boolean),
  };
}