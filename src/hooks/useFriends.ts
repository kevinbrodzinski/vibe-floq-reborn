import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';

export function useFriends() {
  const OFFLINE_MODE = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
  
  if (OFFLINE_MODE) {
    // Mock data for offline mode
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

  // TODO: Re-enable real implementation when network is stable
  const friends = ['b25fd249-5bc0-4b67-a012-f64dacbaef1a'];
  const friendCount = 1;
  const isLoading = false;

  const addFriend = async (targetUserId: string) => {
    console.log('Real: would add friend', targetUserId);
  };

  const removeFriend = async (targetUserId: string) => {
    console.log('Real: would remove friend', targetUserId);
  };

  const friendsSet = useMemo(() => new Set(friends), [friends]);
  const isFriend = (userId: string) => friendsSet.has(userId);

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