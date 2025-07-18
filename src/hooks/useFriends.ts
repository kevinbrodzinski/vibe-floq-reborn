import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { useMemo } from 'react';
import { track } from '@/lib/analytics';
import { pushAchievementEvent } from '@/lib/achievements/pushEvent';
import { OFFLINE_MODE } from '@/lib/constants';

export type FriendPresence = {
  friend_id: string;
  display_name: string;
  avatar_url: string | null;
  username: string;
  bio: string | null;
  vibe_tag: string | null;
  started_at: string | null;
  online: boolean;
};

export function useFriendsWithPresence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // New query using get_friends_with_presence
  const { data: friendsWithPresence = [], isLoading, error: friendsError } = useQuery({
    queryKey: ['friends-with-presence', user?.id, OFFLINE_MODE],
    enabled: !!user?.id && !OFFLINE_MODE,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      // Debug: Check current user session
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('🔍 Auth debug - Frontend user ID:', user?.id);
      console.log('🔍 Auth debug - Supabase user ID:', currentUser?.id);
      
      const { data, error } = await supabase.rpc('get_friends_with_presence');
      
      if (error) {
        console.error('Friends with presence query error:', error);
        throw error;
      }
      
      console.log('🔍 Friends data returned:', data);
      return data ?? [];
    },
  });

  // Real mutations using Supabase RPC functions
  const addFriend = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (OFFLINE_MODE) return;
      
      try {
        const { data, error } = await supabase.rpc('send_friend_request', {
          _target: targetUserId
        });
        if (error) {
          console.error('[send_friend_request] RPC error:', error);
          toast({
            title: "Could not send friend request",
            description: "Please try again later",
            variant: 'destructive',
          });
          return;
        }
      } catch (error: any) {
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
        queryClient.invalidateQueries({ queryKey: ['friends-with-presence'] });
        queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
        toast({
          title: "Friend request sent",
          description: "Your friend request has been sent successfully",
        });
      }
    },
  });

  const removeFriend = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (OFFLINE_MODE) return;
      
      try {
        const { data, error } = await supabase.rpc('remove_friend', {
          _friend: targetUserId
        });
        if (error) {
          console.error('[remove_friend] RPC error:', error);
          toast({
            title: "Could not remove friend",
            description: "Please try again later",
            variant: 'destructive',
          });
          return;
        }
      } catch (error: any) {
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
        queryClient.invalidateQueries({ queryKey: ['friends-with-presence'] });
        queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
        toast({
          title: "Friend removed",
          description: "This person is no longer your friend.",
        });
      }
    },
  });

  // Extract profiles for backward compatibility
  const profiles = useMemo(() => 
    friendsWithPresence.map(friend => ({
      id: friend.friend_id,
      display_name: friend.display_name,
      avatar_url: friend.avatar_url,
      username: friend.username,
      bio: null // bio is not included in FriendPresence type
    })), 
    [friendsWithPresence]
  );

  // Extract friend IDs for compatibility with existing components
  const friendIds = useMemo(() => 
    friendsWithPresence.map(friend => friend.friend_id), 
    [friendsWithPresence]
  );

  // Check if a user is a friend
  const isFriend = useMemo(() => {
    const friendsSet = new Set(friendIds);
    return (userId: string) => friendsSet.has(userId);
  }, [friendIds]);

  // Mock data for offline mode
  if (OFFLINE_MODE) {
    const mockFriends: FriendPresence[] = [{
      friend_id: 'b25fd249-5bc0-4b67-a012-f64dacbaef1a',
      display_name: 'Mock Friend',
      avatar_url: null,
      username: 'mockfriend',
      bio: null,
      vibe_tag: null,
      started_at: null,
      online: false
    }];

    return {
      friendsWithPresence: mockFriends,
      friends: mockFriends.map(f => f.friend_id),
      friendCount: mockFriends.length,
      profiles: mockFriends.map(f => ({ id: f.friend_id, display_name: f.display_name, avatar_url: f.avatar_url, username: f.username, bio: f.bio })),
      isLoading: false,
      addFriend: () => {},
      removeFriend: () => {},
      isAddingFriend: false,
      isRemovingFriend: false,
      isFriend: () => true,
    };
  }

  // Handle auth/loading states gracefully
  if (!user?.id || isLoading || friendsError) {
    return {
      friendsWithPresence: [],
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

  return {
    friendsWithPresence,
    friends: friendIds,
    friendCount: friendIds.length,
    profiles,
    isLoading,
    addFriend: addFriend.mutate,
    removeFriend: removeFriend.mutate,
    isAddingFriend: addFriend.isPending,
    isRemovingFriend: removeFriend.isPending,
    isFriend,
  };
}

export function useFriends() {
  return useFriendsWithPresence();
}