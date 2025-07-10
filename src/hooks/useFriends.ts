import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { useMemo } from 'react';
import { track } from '@/lib/analytics';

export function useFriends() {
  const OFFLINE_MODE = import.meta.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mock data for offline mode
  if (OFFLINE_MODE) {
    const friends = ['b25fd249-5bc0-4b67-a012-f64dacbaef1a'];
    const friendCount = 1;
    const isLoading = false;

    // Disabled mutations - return noop functions
    const addFriend = async (targetUserId: string) => {
      console.log('Mock: would add friend', targetUserId);
    };

    const removeFriend = async (targetUserId: string) => {
      console.log('Mock: would remove friend', targetUserId);
    };

    // Optimized friend set for O(1) lookups
    const friendsSet = useMemo(() => new Set(friends), [friends]);

    // Check if a user is a friend
    const isFriend = (userId: string) => {
      return friendsSet.has(userId);
    };

    return {
      friends,
      friendCount,
      profiles: [], // Mock empty profiles for offline mode
      isLoading,
      addFriend,
      removeFriend,
      isAddingFriend: false,
      isRemovingFriend: false,
      isFriend,
    };
  }

  // Real query for friends list using lean select
  const { data: friendIds = [], isLoading } = useQuery({
    queryKey: ['friends', user?.id, OFFLINE_MODE],
    enabled: !!user?.id && !OFFLINE_MODE,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user!.id);
      
      if (error) {
        toast({ title: 'Could not load friends', variant: 'destructive' });
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
    enabled: friendIds.length > 0 && !OFFLINE_MODE,
    staleTime: 120_000, // 2 minutes
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', friendIds.slice(0, 50));
      if (error) {
        // Phase 1B Fix: Silent error telemetry without user-facing toasts
        track('profile_prefetch_error', { msg: error.message });
        return null; // Return null for better unknown state handling
      }
      return data || [];
    },
  }) as { data: any[] | null, isError: boolean };

  // Optimized friend set for O(1) lookups
  const friendsSet = useMemo(() => new Set(friendIds), [friendIds]);

  // Phase 1B Fix: Handle null profiles gracefully with explicit null checks
  if (profiles === null) {
    // Silent degradation - render without profile data until retry
    const safeFallback: any[] = [];
    return {
      friends: friendIds,
      friendCount: friendIds.length,
      profiles: safeFallback,
      isLoading,
      addFriend: async (targetUserId: string) => console.log('Mock: would add friend', targetUserId),
      removeFriend: async (targetUserId: string) => console.log('Mock: would remove friend', targetUserId),
      isAddingFriend: false,
      isRemovingFriend: false,
      isFriend: (userId: string) => friendsSet.has(userId),
    };
  }

  // Real mutations using Supabase RPC functions
  const addFriend = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.rpc('add_friend', {
        target: targetUserId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast({
        title: "Friend added",
        description: "You are now friends!",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add friend",
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeFriend = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.rpc('remove_friend', {
        target: targetUserId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast({
        title: "Friend removed",
        description: "This person is no longer your friend.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove friend",
        description: error.message,
        variant: 'destructive',
      });
    },
  });


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