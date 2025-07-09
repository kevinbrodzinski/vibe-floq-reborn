import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useFriends() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // List all friends
  const { data: friends = [], isLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_friends');
      if (error) throw error;
      return data as string[];
    },
  });

  // Get friend count
  const { data: friendCount = 0 } = useQuery({
    queryKey: ['friends', 'count'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('friend_count');
      if (error) throw error;
      return data as number;
    },
  });

  // Add friend mutation
  const addFriendMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.rpc('add_friend', { target: targetUserId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast({
        title: "Friend added",
        description: "Successfully added friend",
      });
    },
    onError: (error) => {
      console.error('Failed to add friend:', error);
      toast({
        title: "Failed to add friend",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Remove friend mutation
  const removeFriendMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.rpc('remove_friend', { target: targetUserId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast({
        title: "Friend removed",
        description: "Successfully removed friend",
      });
    },
    onError: (error) => {
      console.error('Failed to remove friend:', error);
      toast({
        title: "Failed to remove friend",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Check if a user is a friend
  const isFriend = (userId: string) => {
    return friends.includes(userId);
  };

  return {
    friends,
    friendCount,
    isLoading,
    addFriend: addFriendMutation.mutateAsync,
    removeFriend: removeFriendMutation.mutateAsync,
    isAddingFriend: addFriendMutation.isPending,
    isRemovingFriend: removeFriendMutation.isPending,
    isFriend,
  };
}