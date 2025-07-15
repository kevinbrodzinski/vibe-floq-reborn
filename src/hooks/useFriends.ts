import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { useMemo } from 'react';
import { track } from '@/lib/analytics';
import { pushAchievementEvent } from '@/lib/achievements/pushEvent';
import { OFFLINE_MODE } from '@/lib/constants';

export function useFriends() {
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Optimized query using new RPC function for friends list
  const { data: friendsWithProfile = [], isLoading, error: friendsError } = useQuery({
    queryKey: ['friends-list', user?.id, OFFLINE_MODE],
    enabled: !!user?.id && !OFFLINE_MODE,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('get_friends_list');
      
      if (error) {
        console.error('Friends list query error:', error);
        throw error;
      }
      return data ?? [];
    },
  });

  // Extract friend IDs for compatibility
  const friendIds = useMemo(() => 
    friendsWithProfile.map(friend => friend.friend_id), 
    [friendsWithProfile]
  );

  // Profiles are already included in the RPC result
  const profiles = useMemo(() => 
    friendsWithProfile.map(friend => ({
      id: friend.friend_id,
      display_name: friend.display_name,
      avatar_url: friend.avatar_url,
      username: friend.username,
      bio: friend.bio
    })), 
    [friendsWithProfile]
  );

  const profilesError = false; // No separate profiles query

  // Real mutations using Supabase RPC functions
  const addFriend = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (OFFLINE_MODE) return; // Short-circuit in offline mode
      
      try {
        const { data, error } = await supabase.rpc('send_friend_request', {
          _target: targetUserId
        });
        if (error) {
          // Log the error for debugging but don't crash the UI
          console.error('[send_friend_request] RPC error:', error);
          toast({
            title: "Could not send friend request",
            description: "Please try again later",
            variant: 'destructive',
          });
          return;
        }
      } catch (error: any) {
        // Handle network/connection errors gracefully
        console.error('[add_friend] Network error:', error);
        toast({
          title: "Connection error", 
          description: "Check your internet connection and try again",
          variant: 'destructive',
        });
        return;
      }
    },
    onSuccess: () => {
      if (!OFFLINE_MODE) {
        queryClient.invalidateQueries({ queryKey: ['friends-list'] });
        queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
        toast({
          title: "Friend request sent",
          description: "Your friend request has been sent successfully",
        });
      }
    },
    onError: (error: any) => {
      // Additional fallback for any errors that slip through
      if (!OFFLINE_MODE) {
        console.warn('Add friend mutation error:', error);
      }
    },
  });

  const removeFriend = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (OFFLINE_MODE) return; // Short-circuit in offline mode
      
      try {
        const { data, error } = await supabase.rpc('remove_friend', {
          _friend: targetUserId
        });
        if (error) {
          // Log the error for debugging but don't crash the UI
          console.error('[remove_friend] RPC error:', error);
          toast({
            title: "Could not remove friend",
            description: "Please try again later",
            variant: 'destructive',
          });
          return;
        }
      } catch (error: any) {
        // Handle network/connection errors gracefully
        console.error('[remove_friend] Network error:', error);
        toast({
          title: "Connection error",
          description: "Check your internet connection and try again", 
          variant: 'destructive',
        });
        return;
      }
    },
    onSuccess: () => {
      if (!OFFLINE_MODE) {
        queryClient.invalidateQueries({ queryKey: ['friends-list'] });
        queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
        toast({
          title: "Friend removed",
          description: "This person is no longer your friend.",
        });
      }
    },
    onError: (error: any) => {
      // Additional fallback for any errors that slip through
      if (!OFFLINE_MODE) {
        console.warn('Remove friend mutation error:', error);
      }
    },
  });

  // Optimized friend set for O(1) lookups
  const friendsSet = useMemo(() => new Set(friendIds), [friendIds]);

  // Mock data for offline mode
  if (OFFLINE_MODE) {
    const mockFriends = ['b25fd249-5bc0-4b67-a012-f64dacbaef1a'];
    const mockFriendsSet = new Set(mockFriends);

    return {
      friends: mockFriends,
      friendCount: 1,
      profiles: [], // Mock empty profiles for offline mode
      isLoading: false,
      addFriend: (targetUserId: string) => {
        console.log('Mock: would add friend', targetUserId);
      },
      removeFriend: (targetUserId: string) => {
        console.log('Mock: would remove friend', targetUserId);
      },
      isAddingFriend: false,
      isRemovingFriend: false,
      isFriend: (userId: string) => mockFriendsSet.has(userId),
    };
  }

  // Handle auth/loading states gracefully
  if (!user?.id || isLoading || friendsError) {
    return {
      friends: [],
      friendCount: 0,
      profiles: [],
      isLoading: isLoading || !user?.id,
      addFriend: () => {},
      removeFriend: () => {},
      isAddingFriend: false,
      isRemovingFriend: false,
      isFriend: () => false,
    };
  }

  // Check if a user is a friend
  const isFriend = (userId: string) => {
    return friendsSet.has(userId);
  };

  return {
    friends: friendIds,
    friendCount: friendIds.length,
    profiles: profiles || [],
    isLoading,
    addFriend: addFriend.mutate,
    removeFriend: removeFriend.mutate,
    isAddingFriend: addFriend.isPending,
    isRemovingFriend: removeFriend.isPending,
    isFriend,
  };
}