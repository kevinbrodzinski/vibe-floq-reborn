import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { useMemo } from 'react';
import { track } from '@/lib/analytics';
import { pushAchievementEvent } from '@/lib/achievements/pushEvent';

export function useFriends() {
  const OFFLINE_MODE = import.meta.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Real query for friends list using lean select
  const { data: friendIds = [], isLoading, error: friendsError } = useQuery({
    queryKey: ['friends', user?.id, OFFLINE_MODE],
    enabled: !!user?.id && !OFFLINE_MODE,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Friends query error:', error);
        throw error;
      }
      return (data ?? []).map(row => row.friend_id as string);
    },
  });

  // Phase 1B Fix: Synchronous cache key with simple truncation
  const stableCacheKey = useMemo(() => {
    const keyRaw = [...friendIds].sort().join(',');
    return friendIds.length > 200 
      ? keyRaw.slice(0, 48) + '...' + keyRaw.slice(-48) 
      : keyRaw;
  }, [friendIds]);

  // 6.2 Prefetch friend profiles in one batched query
  const { data: profiles, isError: profilesError } = useQuery({
    queryKey: ['friend-profiles', stableCacheKey],
    enabled: friendIds.length > 0 && !OFFLINE_MODE && !!user?.id,
    staleTime: 120_000, // 2 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      if (friendIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', friendIds.slice(0, 50));
      if (error) {
        console.error('Profile prefetch error:', error);
        track('profile_prefetch_error', { msg: error.message });
        return []; // Return empty array instead of null
      }
      return data || [];
    },
  }) as { data: any[] | null, isError: boolean };

  // Real mutations using Supabase RPC functions
  const addFriend = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (OFFLINE_MODE) return; // Short-circuit in offline mode
      
      try {
        const { error } = await supabase.rpc('add_friend', {
          target: targetUserId
        });
        if (error) {
          // Log the error for debugging but don't crash the UI
          console.error('[add_friend] RPC error:', error);
          toast({
            title: "Could not add friend",
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
        queryClient.invalidateQueries({ queryKey: ['friends'] });
        toast({
          title: "Friend added",
          description: "You are now friends!",
        });
        // Trigger achievement check
        pushAchievementEvent('friend_added');
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
        const { error } = await supabase.rpc('remove_friend', {
          target: targetUserId
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
        queryClient.invalidateQueries({ queryKey: ['friends'] });
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