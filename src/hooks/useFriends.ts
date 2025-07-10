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
    queryKey: ['friends', user?.id],
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user!.id);
      
      if (error) throw error;
      return (data || []).map(row => row.friend_id as string);
    },
  });

  const { mutateAsync: addFriend, isPending: isAddingFriend } = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.rpc('add_friend', { target: targetUserId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
      toast({
        title: "Friend added",
        description: "Successfully added friend!",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add friend",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { mutateAsync: removeFriend, isPending: isRemovingFriend } = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.rpc('remove_friend', { target: targetUserId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
      toast({
        title: "Friend removed",
        description: "Successfully removed friend.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove friend", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Optimized friend set for O(1) lookups
  const friendsSet = useMemo(() => new Set(friendIds), [friendIds]);

  // Check if a user is a friend
  const isFriend = (userId: string) => {
    return friendsSet.has(userId);
  };

  return {
    friends: friendIds, // Keep friends as the return property name for backward compatibility
    friendCount: friendIds.length,
    isLoading,
    addFriend,
    removeFriend,
    isAddingFriend,
    isRemovingFriend,
    isFriend,
  };
}