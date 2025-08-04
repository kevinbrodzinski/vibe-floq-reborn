import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { sendFriendRequest, acceptFriendRequest } from '@/lib/friends';

export interface RealFriendRequest {
  id: string;
  profile_id: string;
  other_profile_id: string;
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

      // Single query with join to eliminate N+1 problem
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          id, 
          profile_id, 
          other_profile_id, 
          status, 
          created_at,
          requester_profile:profiles!friend_requests_profile_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('other_profile_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching friend requests:', error);
        throw error;
      }

      // Transform to match expected interface, handling missing profiles
      return (data || []).map(request => ({
        ...request,
        requester_profile: request.requester_profile || {
          id: request.profile_id,
          username: 'unknown',
          display_name: 'Unknown User',
          avatar_url: null
        }
      }));
    },
  });

  // Send friend request mutation
  const sendRequest = useMutation({
    mutationFn: sendFriendRequest,
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
      // Get the request details first to find the requester
      const { data: request, error: fetchError } = await supabase
        .from('friend_requests')
        .select('profile_id')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Use the improved accept function
      await acceptFriendRequest(request.profile_id);
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