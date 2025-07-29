import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';

export interface RealFriendRequest {
  id: string;
  profile_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  requester_profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export function useRealFriendRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get pending friend requests received by this user
  const { data: pendingRequests = [], isLoading } = useQuery({
    queryKey: ['real-friend-requests', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('friend_requests')
        .select('id, profile_id, friend_id, status, created_at')
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching friend requests:', error);
        throw error;
      }

      // Get requester profiles separately
      const requesterIds = data?.map(r => r.profile_id) || [];
      if (requesterIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', requesterIds);

      if (profilesError) {
        console.error('Error fetching requester profiles:', profilesError);
        return [];
      }

      // Combine requests with profiles
      return data?.map(request => ({
        ...request,
        requester_profile: profiles?.find(p => p.id === request.profile_id) || {
          id: request.profile_id,
          username: 'unknown',
          display_name: 'Unknown User',
          avatar_url: null
        }
      })) || [];
    },
  });

  // Send friend request mutation
  const sendRequest = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('friend_requests')
        .insert({
          profile_id: user.id,
          friend_id: targetUserId,
          status: 'pending'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-friend-requests'] });
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

  // Accept friend request mutation
  const acceptRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get the request details first
      const { data: request, error: fetchError } = await supabase
        .from('friend_requests')
        .select('profile_id, friend_id')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Update the request status
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Create the friendship (both directions)
      const { error: friendshipError } = await supabase
        .from('friends')
        .insert([
          { user_a: request.profile_id, user_b: request.friend_id },
          { user_a: request.friend_id, user_b: request.profile_id }
        ]);

      if (friendshipError) throw friendshipError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['real-friends'] });
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
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-friend-requests'] });
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

  return {
    pendingRequests,
    isLoading,
    sendRequest: sendRequest.mutate,
    acceptRequest: acceptRequest.mutate,
    declineRequest: declineRequest.mutate,
    isSending: sendRequest.isPending,
    isAccepting: acceptRequest.isPending,
    isDeclining: declineRequest.isPending,
  };
}