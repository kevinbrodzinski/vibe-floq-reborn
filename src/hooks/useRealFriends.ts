import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';

export interface FriendWithProfile {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
  friend_profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
  };
}

export function useRealFriends() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch friends from the friends table
  const { data: friendsData = [], isLoading } = useQuery({
    queryKey: ['real-friends', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('friends')
        .select('user_a, user_b, created_at')
        .eq('user_a', user.id);

      if (error) {
        console.error('Error fetching friends:', error);
        throw error;
      }

      // Get friend profiles separately
      const friendIds = data?.map(f => f.user_b) || [];
      if (friendIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .in('id', friendIds);

      if (profilesError) {
        console.error('Error fetching friend profiles:', profilesError);
        return [];
      }

      // Combine friends with profiles
      return data?.map(friend => ({
        id: friend.user_b,
        user_a: friend.user_a,
        user_b: friend.user_b,
        created_at: friend.created_at,
        friend_profile: profiles?.find(p => p.id === friend.user_b) || {
          id: friend.user_b,
          username: 'unknown',
          display_name: 'Unknown User',
          avatar_url: null,
          bio: null
        }
      })) || [];
    },
  });

  // Add friend mutation
  const addFriend = useMutation({
    mutationFn: async (friendId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Create friend relationship both ways for consistency
      const { error } = await supabase.from('friends').insert([
        { user_a: user.id, user_b: friendId },
        { user_a: friendId, user_b: user.id }
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
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

  // Remove friend mutation
  const removeFriend = useMutation({
    mutationFn: async (friendId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Remove both directions of the friendship
      const { error } = await supabase
        .from('friends')
        .delete()
        .or(`and(user_a.eq.${user.id},user_b.eq.${friendId}),and(user_a.eq.${friendId},user_b.eq.${user.id})`);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real-friends'] });
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

  return {
    friends: friendsData.map(f => f.friend_profile.id),
    friendsWithProfiles: friendsData.map(f => f.friend_profile),
    isLoading,
    addFriend: addFriend.mutate,
    removeFriend: removeFriend.mutate,
    isAddingFriend: addFriend.isPending,
    isRemovingFriend: removeFriend.isPending,
  };
}