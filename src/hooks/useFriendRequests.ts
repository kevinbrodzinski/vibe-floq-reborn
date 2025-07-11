import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { track } from '@/lib/analytics';
import { pushAchievementEvent } from '@/lib/achievements/pushEvent';

export interface FriendRequest {
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
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
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          user_id,
          friend_id,
          status,
          created_at,
          profiles:user_id (
            display_name,
            avatar_url,
            username
          )
        `)
        .eq('friend_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Accept friend request mutation
  const acceptRequest = useMutation({
    mutationFn: async (requesterId: string) => {
      const { data, error } = await supabase.rpc('respond_friend_request', {
        request_user_id: requesterId,
        response_type: 'accepted'
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, requesterId) => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      
      // Track friend achievement
      pushAchievementEvent('friend_added', { friend_id: requesterId });
      
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
    mutationFn: async (requesterId: string) => {
      const { data, error } = await supabase.rpc('respond_friend_request', {
        request_user_id: requesterId,
        response_type: 'declined'
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
      const { error } = await supabase.rpc('request_friendship', {
        _target: targetUserId
      });

      if (error) throw error;
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