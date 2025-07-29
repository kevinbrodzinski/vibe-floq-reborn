import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export interface FriendRow {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
  user_a_profile?: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
  user_b_profile?: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface FriendReqRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  responded_at?: string;
}

export const useFriends = () => {
  const { user } = useAuth();
  
  return useQuery<FriendRow[]>({
    queryKey: ['friends'],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('friends')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

      if (error) throw error;
      return (data || []) as unknown as FriendRow[];
    },
    staleTime: 60_000,
  });
};

export const useFriendRequests = () => {
  const { user } = useAuth();
  
  return useQuery<FriendReqRow[]>({
    queryKey: ['friend_requests'],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as FriendReqRow[];
    },
    staleTime: 30_000,
  });
};

export const useSendFriendRequest = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('friend_requests')
        .insert({ 
          profile_id: user.id, 
          friend_id: friendId,
          status: 'pending'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friend_requests'] });
      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to send friend request",
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useRespondToFriendRequest = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'accepted' | 'declined' }) => {
      const { error } = await supabase
        .from('friend_requests')
        .update({ 
          status,
          responded_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // If accepted, create friendship
      if (status === 'accepted') {
        const { data: request } = await supabase
          .from('friend_requests')
          .select('profile_id, friend_id')
          .eq('id', id)
          .single();

        if (request) {
          await supabase.from('friends').insert([
            { user_a: request.user_id, user_b: request.friend_id },
            { user_a: request.friend_id, user_b: request.user_id }
          ]);
        }
      }
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['friend_requests'] });
      qc.invalidateQueries({ queryKey: ['friends'] });
      toast({
        title: status === 'accepted' ? "Friend request accepted" : "Friend request declined",
        description: status === 'accepted' ? "You are now friends!" : undefined,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to respond to friend request",
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};