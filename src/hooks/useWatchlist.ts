import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

export interface WatchlistItem {
  id: string;
  user_id: string;
  plan_id: string;
  created_at: string;
  plan: {
    id: string;
    title: string;
    description?: string;
    starts_at: string;
    ends_at?: string;
    image_url?: string;
    creator_id: string;
    creator: {
      display_name: string;
      username: string;
      avatar_url?: string;
    };
  };
}

export const useWatchlist = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: watchlist = [], isLoading, error } = useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: async (): Promise<WatchlistItem[]> => {
      if (!user?.id) return [];

      // TODO: Enable when user_watchlist table is created
      return [];

      // const { data, error } = await supabase
      //   .from('user_watchlist')
      //   .select(`
      //     id,
      //     user_id,
      //     plan_id,
      //     created_at,
      //     plans!inner(
      //       id,
      //       title,
      //       description,
      //       starts_at,
      //       ends_at,
      //       image_url,
      //       creator_id,
      //       profiles!plans_creator_id_fkey(
      //         display_name,
      //         username,
      //         avatar_url
      //       )
      //     )
      //   `)
      //   .eq('user_id', user.id)
      //   .order('starts_at', { ascending: true });

      // if (error) throw error;
      // return data || [];
    },
    enabled: !!user?.id,
  });

  const addToWatchlist = useMutation({
    mutationFn: async (planId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // TODO: Enable when user_watchlist table is created
      return { id: 'placeholder', user_id: user.id, plan_id: planId };

      // const { data, error } = await supabase
      //   .from('user_watchlist')
      //   .insert({
      //     user_id: user.id,
      //     plan_id: planId,
      //   })
      //   .select()
      //   .single();

      // if (error) throw error;
      // return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] });
      toast.success('Added to watchlist!');
    },
    onError: (error) => {
      console.error('Failed to add to watchlist:', error);
      toast.error('Failed to add to watchlist');
    },
  });

  const removeFromWatchlist = useMutation({
    mutationFn: async (planId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // TODO: Enable when user_watchlist table is created
      return;

      // const { error } = await supabase
      //   .from('user_watchlist')
      //   .delete()
      //   .eq('user_id', user.id)
      //   .eq('plan_id', planId);

      // if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] });
      toast.success('Removed from watchlist');
    },
    onError: (error) => {
      console.error('Failed to remove from watchlist:', error);
      toast.error('Failed to remove from watchlist');
    },
  });

  const isInWatchlist = (planId: string) => {
    return watchlist.some(item => item.plan_id === planId);
  };

  // Get upcoming plans (starts_at > now)
  const upcomingPlans = watchlist.filter(item => {
    const startTime = new Date(item.plan.starts_at);
    return startTime > new Date();
  });

  // Get past plans (starts_at <= now)
  const pastPlans = watchlist.filter(item => {
    const startTime = new Date(item.plan.starts_at);
    return startTime <= new Date();
  });

  return {
    watchlist,
    upcomingPlans,
    pastPlans,
    isLoading,
    error,
    addToWatchlist: addToWatchlist.mutate,
    removeFromWatchlist: removeFromWatchlist.mutate,
    isInWatchlist,
    isAdding: addToWatchlist.isPending,
    isRemoving: removeFromWatchlist.isPending,
  };
}; 