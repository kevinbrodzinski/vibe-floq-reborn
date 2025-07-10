import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { useMemo } from 'react';

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

  // 6.2 Prefetch friend profiles in one batched query
  const { data: profiles = [] } = useQuery({
    queryKey: ['friend-profiles', friendIds],
    enabled: friendIds.length > 0 && !OFFLINE_MODE,
    staleTime: 120_000, // 2 minutes
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', friendIds.slice(0, 50));
      if (error) throw error;
      return data;
    },
  });

  // Mutation placeholders - still mocked for now
  const addFriend = async (targetUserId: string) => {
    console.log('Mock: would add friend', targetUserId);
  };

  const removeFriend = async (targetUserId: string) => {
    console.log('Mock: would remove friend', targetUserId);
  };

  const isAddingFriend = false;
  const isRemovingFriend = false;

  // Optimized friend set for O(1) lookups
  const friendsSet = useMemo(() => new Set(friendIds), [friendIds]);

  // Check if a user is a friend
  const isFriend = (userId: string) => {
    return friendsSet.has(userId);
  };

  return {
    friends: friendIds, // Keep friends as the return property name for backward compatibility
    friendCount: friendIds.length,
    profiles, // 6.2 - expose profiles for UI components
    isLoading,
    addFriend,
    removeFriend,
    isAddingFriend,
    isRemovingFriend,
    isFriend,
  };
}