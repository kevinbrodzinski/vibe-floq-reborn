import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { track } from '@/lib/analytics';
import { pushAchievementEvent } from '@/lib/achievements/pushEvent';

export interface FriendRequest {
  requester_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  requested_at: string;
}

export function useFriendRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get pending friend requests (requests sent TO this user)
  const { data: pendingRequests = [], isLoading } = useQuery({
    queryKey: ['friend-requests', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pending_friend_requests');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Accept friend request mutation
  const acceptRequest = useMutation({
    mutationFn: async (friendId: string) => {
      const { data, error } = await supabase.rpc('accept_friend_request', {
        _friend: friendId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, friendId) => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friends-with-profile'] });
      queryClient.invalidateQueries({ queryKey: ['friends-list'] });
      
      // Track friend achievement
      pushAchievementEvent('friend_added', { friend_id: friendId });
      
      toast({
        title: "Friend request accepted",
        description: "You are now friends!",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to accept friend request",
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Decline friend request mutation  
  const declineRequest = useMutation({
    mutationFn: async (friendId: string) => {
      const { data, error } = await supabase.rpc('remove_friend', {
        _friend: friendId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      track('friend_request_declined');
      toast({
        title: "Friend request declined",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to decline friend request",
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Send friend request mutation
  const sendRequest = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data, error } = await supabase.rpc('send_friend_request', {
        _target: targetUserId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to send friend request",
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    pendingRequests,
    isLoading,
    acceptRequest: acceptRequest.mutate,
    declineRequest: declineRequest.mutate,
    sendRequest: sendRequest.mutate,
    isAccepting: acceptRequest.isPending,
    isDeclining: declineRequest.isPending,
    isSending: sendRequest.isPending,
  };
}