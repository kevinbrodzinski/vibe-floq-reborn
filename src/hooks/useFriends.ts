import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';

export function useFriends() {
  // EMERGENCY STABILIZATION: Disabled all network activity
  // TODO: Re-enable after fixing network cascade issues
  
  // Mock data to prevent network requests
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