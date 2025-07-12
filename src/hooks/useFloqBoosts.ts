import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';

interface BoostFloqParams {
  floqId: string;
  boostType?: string;
}

// Hook to get user's boost status for a specific floq
export const useUserBoostStatus = (floqId: string) => {
  const userId = useCurrentUserId();
  
  return useQuery({
    queryKey: ['user-boost-status', floqId, userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('floq_boosts')
        .select('id, created_at')
        .eq('floq_id', floqId)
        .eq('user_id', userId)
        .eq('boost_type', 'vibe')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!floqId,
    staleTime: 30_000, // Cache for 30 seconds
  });
};

// Global boost subscription hook
export const useBoostSubscription = () => {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('floq-boosts-global')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'floq_boosts',
          filter: 'boost_type=eq.vibe'
        },
        (payload) => {
          const floqId = payload.new?.floq_id || payload.old?.floq_id;
          
          // Update user boost status if it's the current user
          if (payload.new?.user_id === userId || payload.old?.user_id === userId) {
            queryClient.invalidateQueries({ 
              queryKey: ['user-boost-status', floqId, userId] 
            });
          }
          
          // Update floq lists
          queryClient.invalidateQueries({ queryKey: ['active-floqs'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId, queryClient]);
};

export const useFloqBoost = () => {
  const queryClient = useQueryClient();
  console.log('🔗 useFloqBoost hook initialized');
  const userId = useCurrentUserId();

  const boostFloq = useMutation({
    mutationFn: async ({ floqId, boostType = 'vibe' }: BoostFloqParams) => {
      if (!userId) throw new Error('User not authenticated');
      
      // Use boost analytics edge function with rate limiting
      const { data, error } = await supabase.functions.invoke('boost-analytics', {
        body: {
          action: 'boost',
          floqId,
          userId,
          boostType
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Update user boost status immediately
      queryClient.setQueryData(
        ['user-boost-status', variables.floqId, userId], 
        data.boost
      );
      
      // Optimistically update boost count
      queryClient.setQueryData(['active-floqs'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((floq: any) => 
          floq.id === variables.floqId 
            ? { ...floq, boost_count: (floq.boost_count || 0) + 1 }
            : floq
        );
      });
      
      console.log('📊 Boost analytics data:', data.analytics);
    },
    onError: (error: any) => {
      console.error('❌ Boost error:', error);
      
      // Handle rate limiting specifically
      if (error.status === 429) {
        toast({
          title: "Rate limit exceeded",
          description: "You can only create 60 boosts per hour. Please try again later.",
          variant: "destructive",
        });
        return;
      }
      
      if (error.message?.includes('unique_user_boost') || error.message?.includes('duplicate')) {
        toast({
          title: "Already boosted!",
          description: "You've already boosted this floq.",
          variant: "default",
        });
        return;
      }
      
      toast({
        title: "Failed to boost floq",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  });

  const removeBoost = useMutation({
    mutationFn: async ({ floqId, boostType = 'vibe' }: BoostFloqParams) => {
      if (!userId) throw new Error('User not authenticated');
      
      // Use boost analytics edge function
      const { data, error } = await supabase.functions.invoke('boost-analytics', {
        body: {
          action: 'remove_boost',
          floqId,
          userId,
          boostType
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Update user boost status immediately
      queryClient.setQueryData(
        ['user-boost-status', variables.floqId, userId], 
        null
      );
      
      // Optimistically update boost count
      queryClient.setQueryData(['active-floqs'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((floq: any) => 
          floq.id === variables.floqId 
            ? { ...floq, boost_count: Math.max(0, (floq.boost_count || 0) - 1) }
            : floq
        );
      });
      
      console.log('📊 Boost removed successfully');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove boost",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  });

  return {
    boost: boostFloq.mutate,
    removeBoost: removeBoost.mutate,
    isPending: boostFloq.isPending || removeBoost.isPending,
  };
};